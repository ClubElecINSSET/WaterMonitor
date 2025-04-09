# WaterMonitor

## 🎯 Project Goal

The primary goal of this project is to develop a floating base equipped with various sensors housed in a waterproof enclosure. The collected data is transmitted via XBee modules to a Raspberry Pi, where it will be stored in a database and displayed on a web interface.

## 🛠️ Required Hardware

- **ESP32 Board**
- **Raspberry Pi Board**
- **Connection Cables**
- **Solar Panels**
- **Batteries**
- **Waterproof Enclosure**
- **XBee Modules**
- **Sensors:**
  - Analog TDS Sensor
  - Industrial pH Electrode
  - Analog Dissolved Oxygen Sensor
  - Analog Electrical Conductivity Sensor


## 🔍 Sensors References

### 1. Analog TDS Sensor/Meter

- **Link**: [Analog TDS Sensor - DFRobot](https://wiki.dfrobot.com/Gravity__Analog_TDS_Sensor___Meter_For_Arduino_SKU__SEN0244)
- **Voltage Range**: 3.3 ~ 5.5 V

### 2. Industrial pH Electrode - SKU: FIT0348

- **Link**: [Industrial pH Electrode - DFRobot](https://wiki.dfrobot.com/Industrial_pH_electrode_SKU_FIT0348_)
- **Voltage Range**: 5.0 V

### 3. Analog Dissolved Oxygen Sensor - SKU: SEN0237

- **Link**: [Gravity Analog Dissolved Oxygen Sensor SEN0237 - DFRobot](https://wiki.dfrobot.com/Gravity__Analog_Dissolved_Oxygen_Sensor_SKU_SEN0237)
- **Voltage Range**: 3.3 ~ 5.5 V

### 4. Analog Electrical Conductivity Sensor - SKU: SEN0451

- **Link**: [Gravity Analog Electrical Conductivity Sensor SEN0451 - DFRobot](https://wiki.dfrobot.com/SKU_SEN0451_Gravity_Analog_Electrical_Conductivity_Sensor_PRO_K_1)
- **Voltage Range**: 3.3 ~ 5.0 V

## 📊 Data to Retrieve

### List of Data to Collect:

- **TDS (ppm)**: Total Dissolved Solids concentration (parts per million).
- **pH**: Acidity or basicity level of the solution.
- **Dissolved Oxygen (mg/L)**: Concentration of dissolved oxygen in water.
- **Conductivity (µS/cm)**: Electrical conductivity of the solution.
- **Temperature (°C)**: Water temperature (may require a separate temperature sensor).

## ⚙️ Installation

### Installing the ESP32 Board in Arduino IDE

1. **Open Arduino IDE**: Make sure you have the latest version installed.
2. **Access Preferences**: Go to `File` > `Preferences`.
3. **Add Board URL**: In the "Additional Board Manager URLs" field, add the following URL: https://dl.espressif.com/dl/package_esp32_index.json
   If there are already URLs in this field, separate them with commas.
4. **Open Board Manager**: Go to `Tools` > `Board` > `Board Manager`.
5. **Search for ESP32**: Type "ESP32" in the search bar and install the latest version of the ESP32 by Espressif Systems.
6. **Select the ESP32 Board**: Go to `Tools` > `Board`, and choose your specific ESP32 board.

### Installing on Raspberry Pi

To set up the necessary environment on your Raspberry Pi, run the following command in the terminal:

```bash
curl -o install.sh https://raw.githubusercontent.com/LordYoni/WaterMonitor/refs/heads/main/Raspberry/install.sh
```
This command modifies the permissions of install.sh, making it executable. It's necessary to do this before you can run the script.

```bash
chmod +x install.sh
```
This command downloads the installation script. Once downloaded, you can run it to install the required components.

```bash
sudo ./install.sh
```

## 🤝 Contributing

Contributions are welcome! Please submit a pull request or open an issue to discuss any changes you wish to propose.

### Special Thanks

A big thank you to the following contributors for their invaluable collaboration on this project. We worked together to bring this project to life:

- [Eliot](https://github.com/GrosChien)
- [Thomas](https://github.com/Thomas127)
- [Zakariya](https://github.com/zakariyaelk)
