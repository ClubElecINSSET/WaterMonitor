
#include "Temperature.h"

TemperatureSensor::TemperatureSensor(const uint8_t &channel) : Sensor(channel) {}
TemperatureSensor::~TemperatureSensor() {}

// Function to calculate temperature from PT1000 sensor
void TemperatureSensor::poll()
{
    pollVoltage();

    const float Rpt1000 = (m_voltage / GDIFF + VR0) / I / G0;
    m_value             = (Rpt1000 - 1000.0f) / 3.85f;

    m_value_error = m_value < MINIMUM_TEMPERATURE || m_value > MAXIMUM_TEMPERATURE ? true : false;
}

void TemperatureSensor::printState() const
{
    Serial.print(F("Temperature: "));
    serialPrintValue();
    Serial.print(F(" °C, voltage: "));
    Serial.print(m_voltage);
    Serial.println(F("v"));
}