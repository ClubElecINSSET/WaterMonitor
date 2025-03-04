
#include "tdsSensor.h"


tdsSensor::tdsSensor(const uint8_t &channel, const TemperatureSensor &temperature)
    : Sensor(channel), m_tempeature(temperature) {}

tdsSensor::~tdsSensor() {}

//Function to calculate TDS value
void tdsSensor::poll()
{
    pollVoltage();
    //Doesn't poll voltage from temp

    const float compensationCoefficient = 1.0f + 0.02f * (m_tempeature.getValue() - 25.0f);
    const float compensatedVoltage = m_voltage / compensationCoefficient;

    m_value = (133.42f * pow(compensatedVoltage, 3.0f) -
          255.86f * pow(compensatedVoltage, 2.0f) + 857.39f * compensatedVoltage) * 0.5f;
    
    setErrorFlagIfNegativeValue();
}

void tdsSensor::printState() const
{
    Serial.print(F("TDS: "));
    serialPrintValue();
    Serial.println(F(" ppm"));
}