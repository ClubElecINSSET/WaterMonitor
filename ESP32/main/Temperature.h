#ifndef Temperature_H
#define Temperature_H

#include "baseSensorClass.h"

class TemperatureSensor : public Sensor
{
public:
    TemperatureSensor(const uint8_t &channel);
    ~TemperatureSensor() override;

    void poll() override;
    void printState() const override;

private:
    // Constants for temperature calculations
    static constexpr inline float GDIFF = 30.0f / 1.8f;
    static constexpr inline float VR0   = 0.223f;
    static constexpr inline float G0    = 2.0f;
    static constexpr inline float I     = 1.24f / 10000.0f;

    static constexpr inline float MINIMUM_TEMPERATURE = -5.0f;
    static constexpr inline float MAXIMUM_TEMPERATURE = 40.0f;
};

#endif