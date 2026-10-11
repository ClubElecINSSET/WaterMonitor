#ifndef ConductivitySensor_H
#define ConductivitySensor_H

#include "baseSensorClass.h"
#include "Temperature.h"

class ConductivitySensor : public Sensor
{
private:
    const TemperatureSensor &m_temperature;

public:
    ConductivitySensor(const uint8_t &channel, const TemperatureSensor &temperature);
    ~ConductivitySensor() override;

    void poll() override;
    void printState() const override;

private:
    // Constants for Conductivity calculation
    static constexpr inline float k     = 1151.604395604395604f;
    static constexpr inline float RES2  = 820.0f;
    static constexpr inline float ECREF = 200.0f;
};

#endif