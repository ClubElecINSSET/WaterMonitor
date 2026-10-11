#ifndef tdsSensor_H
#define tdsSensor_H

#include "baseSensorClass.h"
#include "Temperature.h"


class tdsSensor : public Sensor
{
private:
    const TemperatureSensor &m_temperature;

public:
    tdsSensor(const uint8_t &channel, const TemperatureSensor &temperature);
    ~tdsSensor() override;

    void poll() override;
    void printState() const override;
};

#endif