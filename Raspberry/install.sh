#!/usr/bin/env bash
# WaterMonitor installer for Raspberry Pi OS. Safe to re-run: it updates the code
# and keeps the database and its passwords.
#   sudo ./install.sh                 install / update from the main branch
#   sudo BRANCH=dev ./install.sh      install another branch
#   sudo KIOSK=0 ./install.sh         do not open the dashboard full screen at boot
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ClubElecINSSET/WaterMonitor.git}"
BRANCH="${BRANCH:-main}"
KIOSK="${KIOSK:-1}"
INSTALL_DIR="/opt/watermonitor"
APP_DIR="$INSTALL_DIR/Raspberry"
CONF_DIR="/etc/watermonitor"
DB_NAME="watermonitor"
SERVICE_USER="watermonitor"

if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo ./install.sh"
    exit 1
fi

echo "==> Installing system packages"
apt-get update
apt-get install -y curl git openssl mariadb-server nodejs npm python3-venv

echo "==> Creating the $SERVICE_USER system user"
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
    useradd --system --no-create-home --shell /usr/sbin/nologin --groups dialout "$SERVICE_USER"
fi

echo "==> Fetching the code ($BRANCH)"
if [ -d "$INSTALL_DIR/.git" ]; then
    git -C "$INSTALL_DIR" fetch --depth 1 origin "$BRANCH"
    git -C "$INSTALL_DIR" checkout -B "$BRANCH" FETCH_HEAD
else
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

echo "==> Configuring the database"
mkdir -p "$CONF_DIR"
chmod 700 "$CONF_DIR"
# Reuse passwords from a previous install, otherwise generate new ones
WEB_PASS=$(grep -s '^DB_PASS=' "$CONF_DIR/web.env" | cut -d= -f2- || true)
READER_PASS=$(grep -s '^DB_PASS=' "$CONF_DIR/reader.env" | cut -d= -f2- || true)
WEB_PASS="${WEB_PASS:-$(openssl rand -hex 16)}"
READER_PASS="${READER_PASS:-$(openssl rand -hex 16)}"

systemctl enable --now mariadb
mysql <<SQL
CREATE DATABASE IF NOT EXISTS $DB_NAME;
CREATE USER IF NOT EXISTS 'wm_web'@'localhost' IDENTIFIED BY '$WEB_PASS';
ALTER USER 'wm_web'@'localhost' IDENTIFIED BY '$WEB_PASS';
CREATE USER IF NOT EXISTS 'wm_reader'@'localhost' IDENTIFIED BY '$READER_PASS';
ALTER USER 'wm_reader'@'localhost' IDENTIFIED BY '$READER_PASS';
SQL
mysql "$DB_NAME" < "$APP_DIR/schema.sql"
mysql <<SQL
GRANT SELECT ON $DB_NAME.Data TO 'wm_web'@'localhost';
GRANT INSERT ON $DB_NAME.Data TO 'wm_reader'@'localhost';
FLUSH PRIVILEGES;
SQL

write_env() {  # file user password [extra lines]
    install -m 600 /dev/null "$1"
    printf 'DB_SOCKET=/run/mysqld/mysqld.sock\nDB_NAME=%s\nDB_USER=%s\nDB_PASS=%s\n%s' "$DB_NAME" "$2" "$3" "${4:-}" > "$1"
}
write_env "$CONF_DIR/web.env" wm_web "$WEB_PASS" "PORT=80
"
write_env "$CONF_DIR/reader.env" wm_reader "$READER_PASS" "SERIAL_PORT=/dev/ttyUSB0
"

echo "==> Installing the web server (Node.js)"
(cd "$APP_DIR" && npm ci --omit=dev)

echo "==> Installing the XBee reader (Python)"
python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install --quiet -r "$APP_DIR/requirements.txt"

echo "==> Starting the services"
install -m 644 "$APP_DIR"/systemd/*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable watermonitor-web watermonitor-reader
systemctl restart watermonitor-web watermonitor-reader

# Full-screen dashboard on the Pi's own display (Raspberry Pi OS with desktop only)
if [ "$KIOSK" = 1 ] && [ -d /etc/xdg/autostart ] && { command -v chromium-browser || command -v chromium; } >/dev/null; then
    echo "==> Setting up the full-screen dashboard (kiosk)"
    install -m 755 "$APP_DIR/kiosk.sh" /usr/local/bin/watermonitor-kiosk
    cat > /etc/xdg/autostart/watermonitor-kiosk.desktop <<'DESKTOP'
[Desktop Entry]
Type=Application
Name=WaterMonitor
Exec=/usr/local/bin/watermonitor-kiosk
DESKTOP
    if command -v raspi-config >/dev/null; then
        raspi-config nonint do_boot_behaviour B4  # boot to the desktop, logged in
        raspi-config nonint do_blanking 1         # keep the screen on
    fi
    KIOSK_MSG="  Kiosk:       opens at boot; remove /etc/xdg/autostart/watermonitor-kiosk.desktop to disable"
else
    KIOSK_MSG="  Kiosk:       not set up (needs Raspberry Pi OS with desktop and Chromium)"
fi

IP=$(hostname -I | awk '{print $1}')
cat <<EOF

All done!
  Dashboard:   http://$IP/
  Logs:        journalctl -u watermonitor-web -u watermonitor-reader -f
  Demo data:   sudo mysql $DB_NAME < $APP_DIR/test_values.sql
  Serial port: edit $CONF_DIR/reader.env, then sudo systemctl restart watermonitor-reader
$KIOSK_MSG
EOF
