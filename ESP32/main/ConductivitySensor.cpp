
#include "ConductivitySensor.h"

ConductivitySensor::ConductivitySensor(const uint8_t &channel, const TemperatureSensor &temperature)
    : Sensor(channel), m_temperature(temperature)
{
}

ConductivitySensor::~ConductivitySensor() {}

// Function to calculate conductivity
void ConductivitySensor::poll()
{
    pollVoltage();
    // Doesn't poll voltage from temperature

    const float ecValue = 100000.0f * m_voltage / RES2 / ECREF * k;
    m_value = ecValue / (1.0f + 0.02f * (m_temperature.isValueWrong() ? 0.0f : m_temperature.getValue() - 25.0f));

    setErrorFlagIfNegativeValue();
}

void ConductivitySensor::printState() const
{
    Serial.print(F("Conductivity: "));
    serialPrintValue();
    Serial.print(F(" uS/cm, Voltage: "));
    Serial.print(m_voltage);
    Serial.println(F("v"));
}