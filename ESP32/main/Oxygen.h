#ifndef Oxygen_H
#define Oxygen_H

#include "baseSensorClass.h"
#include "Temperature.h"

class OxygenSensor : public Sensor
{
private:
    const TemperatureSensor &m_temperature;

public:
    OxygenSensor(const uint8_t &channel, const TemperatureSensor &temperature);
    ~OxygenSensor() override;

    void poll() override;
    void printState() const override;

private:
    // CAL1 High temperature point, CAL2 Low temperature point

    // Single point calibration needs CAL1_V and CAL1_T to be filled
    static constexpr inline uint16_t CAL1_V = 1600; // mv
    static constexpr inline uint8_t  CAL1_T = 25;   // ℃

    // Two-point calibration needs CAL2_V and CAL2_T to be filled
    static constexpr inline uint16_t CAL2_V = 1300; // mv
    static constexpr inline uint8_t  CAL2_T = 15;   // °C

    static constexpr inline const uint16_t DO_Table[41] = {
        14460, 14220, 13820, 13440, 13090, 12740, 12420, 12110, 11810, 11530, 11260, 11010, 10770, 10530,
        10300, 10080, 9860,  9660,  9460,  9270,  9080,  8900,  8730,  8570,  8410,  8250,  8110,  7960,
        7820,  7690,  7560,  7430,  7300,  7180,  7070,  6950,  6840,  6730,  6630,  6530,  6410};
};

#endif