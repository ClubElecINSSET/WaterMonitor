
#include "PhSensor.h"

PhSensor::PhSensor(const uint8_t &channel) : Sensor(channel) {}
PhSensor::~PhSensor() {}

// Function to calculate pH value
void PhSensor::poll()
{
    pollVoltage();

    m_value = 3.5f * m_voltage + OFFSET;

    setErrorFlagIfNegativeValue();
    m_value_error = m_value > 14.0f ? true : m_value_error;
}

void PhSensor::printState() const
{
    Serial.print(F("pH: "));
    serialPrintValue();
    Serial.print(F(", voltage: "));
    Serial.print(m_voltage);
    Serial.println(F("v"));
}