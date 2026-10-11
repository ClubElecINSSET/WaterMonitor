
#include "baseSensorClass.h"

Sensor::Sensor(const uint8_t &channel) : m_channel(channel), m_value_error(true) {}
Sensor::~Sensor() {}

void Sensor::pollVoltage() { m_voltage = ((float)s_mcp->readADC(m_channel)) * VREF / (float)ADC_RESOLUTION; }

void Sensor::setErrorFlagIfNegativeValue() { m_value_error = m_value < 0.0f ? true : false; }

boolean Sensor::isValueWrong() const { return m_value_error; }

void Sensor::serialPrintValue() const { m_value_error ? Serial.print(F("Invalid")) : Serial.print(m_value); }

float Sensor::getValue() const { return m_value; }