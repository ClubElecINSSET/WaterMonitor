# WaterMonitor

[![CI](https://github.com/ClubElecINSSET/WaterMonitor/actions/workflows/ci.yml/badge.svg)](https://github.com/ClubElecINSSET/WaterMonitor/actions/workflows/ci.yml)

Bouée flottante qui mesure la qualité de l'eau du **Parc d'Isle** (Saint-Quentin) et l'affiche en direct sur un tableau de bord.

```
 Bouée                                   Raspberry Pi
┌───────────────────────┐   XBee    ┌──────────────────────────────────────────────┐
│ sondes → MCP3008 → ESP32 ───────────► reader.py → MariaDB → server.js → navigateur │
└───────────────────────┘ 1 trame/s └──────────────────────────────────────────────┘
```

| Mesure                | Unité | Plage idéale |
| --------------------- | ----- | ------------ |
| Température           | °C    | < 15 °C      |
| pH                    |       | 5,5 – 7,0    |
| Oxygène dissous       | mg/L  | 4 – 7 mg/L   |
| TDS (solides dissous) | ppm   | < 100 ppm    |
| Conductivité          | µS/cm | < 150 µS/cm  |

Les seuils sont dans [`Raspberry/Website/src/metrics.js`](Raspberry/Website/src/metrics.js).

## Arborescence

```
ESP32/main/          firmware Arduino de la bouée
ESP32/test/          tests du firmware sur PC
Raspberry/
  reader.py          lit l'XBee et enregistre les mesures
  server.js          API + tableau de bord (Node.js / Express)
  Website/src/       sources du tableau de bord (React, Tailwind, shadcn/ui)
  Website/dist/      tableau de bord compilé, commité : le Pi ne compile rien
  install.sh         installateur du Pi
  schema.sql         table Data
  test_values.sql    24 h de données de démo
.github/workflows/   intégration continue
```

## Matériel

- ESP32, convertisseur analogique-numérique **MCP3008** (10 bits, référence 3,3 V)
- Raspberry Pi (Raspberry Pi OS Bookworm), écran tactile officiel 800×480 en option
- 2 modules XBee (bouée et Pi), boîtier étanche, panneaux solaires, batteries
- Sondes DFRobot :
  - [TDS — SEN0244](https://wiki.dfrobot.com/Gravity__Analog_TDS_Sensor___Meter_For_Arduino_SKU__SEN0244)
  - [pH industriel — FIT0348](https://wiki.dfrobot.com/Industrial_pH_electrode_SKU_FIT0348_)
  - [Oxygène dissous — SEN0237](https://wiki.dfrobot.com/Gravity__Analog_Dissolved_Oxygen_Sensor_SKU_SEN0237)
  - [Conductivité — SEN0451](https://wiki.dfrobot.com/SKU_SEN0451_Gravity_Analog_Electrical_Conductivity_Sensor_PRO_K_1)
  - Température : sonde PT1000 avec amplificateur

Câblage du MCP3008 sur l'ESP32 (défini dans `main.ino`) :

| MCP3008     | GPIO ESP32 |     | Canal MCP3008 | Sonde        |
| ----------- | ---------- | --- | ------------- | ------------ |
| CS          | 5          |     | 0             | pH           |
| CLK         | 18         |     | 1             | Conductivité |
| MOSI (DIN)  | 23         |     | 2             | Température  |
| MISO (DOUT) | 19         |     | 3             | Oxygène      |
|             |            |     | 4             | TDS          |

L'XBee de la bouée est relié au port série de l'ESP32 (`Serial`, 9600 bauds). Celui du Pi est branché en USB (`/dev/ttyUSB0`).

## ESP32 : flasher le firmware

1. Arduino IDE → _Fichier_ → _Préférences_ → _URL de gestionnaire de cartes supplémentaires_ : `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
2. _Outils_ → _Carte_ → _Gestionnaire de carte_ : installer **esp32** d'Espressif (testé avec la 3.3.12).
3. Bibliothèque MCP3008 : télécharger [nodesign/MCP3008](https://github.com/nodesign/MCP3008) en ZIP, puis _Croquis_ → _Inclure une bibliothèque_ → _Ajouter la bibliothèque .ZIP_.
4. Ouvrir `ESP32/main/main.ino`, choisir la carte (_ESP32 Dev Module_) et téléverser.

Pour lire les valeurs en clair dans le moniteur série (sans XBee), passer `sendToSerialMonitor` à `true` dans `main.ino`. **Remettre `false` avant de poser la bouée**, sinon le Pi ne reçoit aucune mesure.

### Étalonnage

Les constantes ne viennent pas d'un étalonnage fait sur ces sondes : à refaire avec des solutions étalons avant de se fier aux mesures.

| Sonde        | Où                                                        | À faire                                                                                                                                                                                 |
| ------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pH           | `PhSensor.cpp` / `.h` (`3,5 × V + OFFSET`, `OFFSET = -5`) | Avec cette formule et l'ADC en 3,3 V, le pH ne peut pas dépasser **6,54**. Étalonner avec des solutions pH 4 et 7 et vérifier la tension de sortie de la sonde.                         |
| Oxygène      | `Oxygen.h` (`CAL1_V`, `CAL2_V`)                           | Valeurs de l'exemple DFRobot. Mesurer la tension en air saturé à deux températures ([procédure DFRobot](https://wiki.dfrobot.com/Gravity__Analog_Dissolved_Oxygen_Sensor_SKU_SEN0237)). |
| Conductivité | `ConductivitySensor.h` (`k`)                              | Vérifier avec une solution étalon (1413 µS/cm).                                                                                                                                         |

### Limites connues

- Les températures négatives arrivent sans leur signe (−2,5 °C est lu +2,5 °C) : la trame ne transporte pas le signe.
- Sans température valide (sonde débranchée, ou eau sous 0 °C), l'oxygène est signalé en erreur, et le TDS et la conductivité sont calculés sans compensation (comme à 25 °C).
- La bouée envoie une trame par seconde, soit environ 86 000 lignes par jour dans la base.

## Format de la trame

16 octets, envoyés une fois par seconde par `sendToXbee.cpp` et décodés par `reader.py` :

| Octet   | 0      | 1–2         | 3–4 | 5–7 | 8–10         | 11–13   | 14                | 15     |
| ------- | ------ | ----------- | --- | --- | ------------ | ------- | ----------------- | ------ |
| Contenu | `0xA0` | température | pH  | TDS | conductivité | oxygène | somme de contrôle | `0x0A` |

- Chaque valeur est envoyée comme une partie entière (1 octet, ou 2 octets poids fort d'abord), suivie des centièmes (1 octet). Exemple : 412,07 → `01 9C 07`.
- Un premier octet à `0xFF` signale un capteur en erreur, enregistré comme `NULL`.
- La somme de contrôle est la somme des octets 1 à 13, modulo 256. Une trame invalide est ignorée et le lecteur se resynchronise sur le `0xA0` suivant.

## Raspberry Pi

### Installation

Sur un Raspberry Pi OS Bookworm, de préférence la version avec bureau :

```bash
curl -o install.sh https://raw.githubusercontent.com/ClubElecINSSET/WaterMonitor/main/Raspberry/install.sh
chmod +x install.sh
sudo ./install.sh
```

Le script peut être relancé à tout moment pour mettre à jour : il garde la base et les mots de passe. Il installe :

- **MariaDB** : base `watermonitor`, avec deux utilisateurs, `wm_web` (lecture seule) et `wm_reader` (insertion seule). Les mots de passe sont générés et rangés dans `/etc/watermonitor/` (accessible à root uniquement).
- **`watermonitor-web`** : le tableau de bord, sur le port 80.
- **`watermonitor-reader`** : le lecteur XBee.
- **Le kiosque**, si le Pi a un bureau et Chromium : connexion automatique, tableau de bord en plein écran au démarrage, écran qui ne se met jamais en veille.

Options : `sudo BRANCH=dev ./install.sh` installe une autre branche, `sudo KIOSK=0 ./install.sh` saute le kiosque, `REPO_URL=…` change de dépôt.

### Utilisation

Le tableau de bord est accessible sur `http://<adresse-du-pi>/` :

- `/#/` : direct (dernières valeurs, jauges, graphique) ;
- `/#/historique` : les 50 dernières mesures ;
- `/#/compact` : version pour l'écran 800×480, choisie d'office sur les petits écrans.

Le bouton de période (1 h à « Toujours ») règle tous les graphiques de l'écran.

```bash
journalctl -u watermonitor-web -u watermonitor-reader -f                # journaux
sudo systemctl restart watermonitor-reader                              # relancer le lecteur
sudo mysql watermonitor < /opt/watermonitor/Raspberry/test_values.sql   # 24 h de données de démo
```

Le port série de l'XBee se règle dans `/etc/watermonitor/reader.env` (`SERIAL_PORT`, par défaut `/dev/ttyUSB0`), puis relancer le lecteur.

### API

| Route                            | Réponse                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `GET /api/measures?limit=1..200` | `{count, now, rows}` : les dernières mesures brutes, de la plus ancienne à la plus récente, et l'heure du serveur |
| `GET /api/history?hours=1..8760` | `{hours, bucket, points}` : moyennes par tranches (144 points au plus) ; `hours=0` remonte à la première mesure   |

`ts` est un horodatage Unix en secondes. Un capteur en erreur vaut `null`.

### Dépannage

| Symptôme                                     | Cause probable                                                                                                                                                                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Bouée hors ligne »                         | Aucune trame depuis 30 min (au-delà de 15 min, la qualité générale passe au mieux à « Moyen ») : voir `journalctl -u watermonitor-reader`. Si aucune trame n'arrive, vérifier `sendToSerialMonitor` (doit être `false`), l'alimentation et l'appairage des XBee. |
| « Corrupt frame, skipped » de temps en temps | Parasites radio : sans gravité, le lecteur se resynchronise.                                                                                                                                                                                                     |
| `watermonitor-web` ne démarre pas            | Le port 80 est déjà pris, souvent par l'Apache de l'ancienne version : `sudo apt purge apache2`.                                                                                                                                                                 |
| Heure des mesures fausse                     | Le Pi n'a pas d'horloge interne : sans Internet au démarrage, l'heure reste fausse jusqu'à la synchronisation.                                                                                                                                                   |
| « 1 an » ou « Toujours » lents               | Ces périodes recalculent des millions de lignes. Le résultat est mis en cache, de 30 s à 1 h selon la période.                                                                                                                                                   |

## Développement

### Tableau de bord (sur PC)

Il faut Node.js 20 ou plus, Python 3 et Docker. Depuis `Raspberry/` :

```bash
npm install
npm run db        # MariaDB locale dans Docker (conteneur wm-db)
npm run seed      # crée la table et charge 24 h de données de démo
npm run dev       # http://localhost:8080, rechargement à chaud
npm run build     # recompile Website/dist : à commiter avec toute modification du site
```

Les données de démo vieillissent : relancer `npm run seed` si le site affiche « Hors ligne ». Composants shadcn : `npx shadcn@latest add <nom>`.

### Tests

```bash
cd Raspberry
npm test                # seuils du tableau de bord + décodage des trames
npm run test:api        # API, avec la base de démo (npm run db && npm run seed)
cd ../ESP32/test
python3 -m unittest test_firmware   # firmware compilé sur PC (g++), trames vérifiées par reader.py
```

### Lint et formatage

Les outils sont installés à la racine du dépôt (le Pi ne les installe jamais) ; Ruff et clang-format passent par [uv](https://docs.astral.sh/uv/).

```bash
npm install       # à la racine
npm run lint      # vérifie tout
npm run format    # corrige tout ce qui peut l'être
```

| Langage              | Outil                                  | Config                                 |
| -------------------- | -------------------------------------- | -------------------------------------- |
| JavaScript / JSX     | ESLint (règles React Hooks) + Prettier | `eslint.config.js`, `.prettierrc.json` |
| JSON, YAML, Markdown | Prettier                               | `.prettierrc.json`, `.prettierignore`  |
| Python               | Ruff (lint + format)                   | `ruff.toml`                            |
| C++ (ESP32)          | clang-format                           | `.clang-format`                        |
| Shell                | shellcheck (dans la CI)                |                                        |
| Tous                 | indentation, fins de ligne             | `.editorconfig`                        |

Les éditeurs qui gèrent EditorConfig, Prettier et ESLint (VS Code avec leurs extensions, par exemple) appliquent ces réglages automatiquement.

### Intégration continue

À chaque push et à chaque pull request, [GitHub Actions](.github/workflows/ci.yml) lance trois jobs :

- **Lint** : `npm run lint` (ESLint, Prettier, Ruff, clang-format).

- **Raspberry** : tests, vérification que `Website/dist` correspond aux sources, tests de l'API sur une vraie MariaDB, démarrage du serveur sous Node 18 (la version du Pi), shellcheck de `install.sh` et `kiosk.sh`.
- **ESP32** : tests du firmware, puis compilation pour ESP32 avec `arduino-cli` ; un avertissement de compilation fait échouer le job.

Pour la lancer en local avec [act](https://github.com/nektos/act) : `act push -P ubuntu-24.04=catthehacker/ubuntu:act-24.04` (sa base de test utilise le port 3307, la base de dev peut rester allumée).

## Contributeurs

- [Yoni](https://github.com/LordYoni)
- [Eliot](https://github.com/GrosChien)
- [Thomas](https://github.com/Thomas127)
- [Zakariya](https://github.com/zakariyaelk)

Licence [MIT](LICENSE.txt).
