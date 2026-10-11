#ifndef Sensor_H
#define Sensor_H

#include <MCP3008.h>

class Sensor
{
private:
    // Const ptr to an MCP3008 object
    static MCP3008 *const s_mcp;

    // Cannot be declared as a const reference because the
    // readADC() method is not declared as const even though
    // it doesn't modify any of its class members.

    // MCP channel of sensor
    const uint8_t m_channel;

protected:
    boolean m_value_error;

    float m_voltage;
    float m_value;

    Sensor(const uint8_t &channel);

    void pollVoltage();

    void setErrorFlagIfNegativeValue();
    void serialPrintValue() const;

public:
    virtual ~Sensor();

    virtual void poll()             = 0;
    virtual void printState() const = 0;

    float getValue() const;

    boolean isValueWrong() const;

protected:
    static constexpr inline uint16_t ADC_RESOLUTION = 1024;
    static constexpr inline float    VREF           = 3.3f; // Reference voltage for MCP3008 (3.3v)
};

#endif