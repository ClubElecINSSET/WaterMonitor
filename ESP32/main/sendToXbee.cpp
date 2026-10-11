
#include "baseSensorClass.h"
#include "PhSensor.h"
#include "Temperature.h"
#include "tdsSensor.h"
#include "ConductivitySensor.h"
#include "Oxygen.h"


float abs_float(const float &number)
{
    if(number < 0.0f)
        return -number;

    return number;
}

uint8_t getMSB(const float &number) { return (uint8_t)( abs_float(number) / 256 ); }

//Through uint16_t: casting a float >= 256 straight to uint8_t is undefined behaviour
uint8_t getLSB(const float &number) { return (uint8_t)(uint16_t)abs_float(number); }

uint8_t getDecimal(float number)
{
    number = abs_float(number) + 0.005f;    //Absolute value + rounding
    number -= (float)(uint16_t)number;      //Discard integer part
    number *= 100.0f;                       //Move the first two decimal digits

    return (uint8_t)number;                 //Cast to a byte
}

void writeToArray
(
            uint8_t     *array,
            uint8_t     &index,
    const   Sensor      &sensor,
    const   uint8_t     &size
)
{
    if(sensor.isValueWrong())
    {
        array[index] = 0xff;
        index += size;
        return;
    }

    if(size == 3)
        array[index++] = getMSB (sensor.getValue());

    array[index++] = getLSB     (sensor.getValue());
    array[index++] = getDecimal (sensor.getValue());
}



void sendToXbee
(
    const PhSensor              &ph,
    const TemperatureSensor     &temperature,
    const tdsSensor             &tds,
    const ConductivitySensor    &conductivity,
    const OxygenSensor          &oxygen
)
{
    //All numbers are unsigned, except temperature_LSB
    enum arrayIndex : uint8_t
    {
        start,

        temperature_LSB,
        temperature_dec,

        pH_LSB,
        pH_dec,

        TDS_MSB,
        TDS_LSB,
        TDS_dec,

        conductivity_MSB,
        conductivity_LSB,
        conductivity_dec,

        oxygen_MSB,
        oxygen_LSB,
        oxygen_dec,

        checksum,
        end
    };

    const uint8_t ARRAY_SIZE    = arrayIndex::end + 1;
    const uint8_t START_BYTE    = 0xa0;
    const uint8_t STOP_BYTE     = 0x0a;

    uint8_t checksum_var = 0;
    uint8_t array_index;

    uint8_t array[ARRAY_SIZE];

    array[start] = START_BYTE;

    array_index = arrayIndex::start + 1;

    writeToArray(array, array_index, temperature,   2);
    writeToArray(array, array_index, ph,            2);
    writeToArray(array, array_index, tds,           3);
    writeToArray(array, array_index, conductivity,  3);
    writeToArray(array, array_index, oxygen,        3);

    //calculate checksum
    for(uint8_t i = arrayIndex::start + 1; i != arrayIndex::checksum; i++)
        checksum_var += array[i];

    array[arrayIndex::checksum] = checksum_var;
    array[arrayIndex::end]      = STOP_BYTE;

    //send to Xbee
    for (uint8_t i = 0; i < ARRAY_SIZE; i++)
        Serial.write(array[i]);
}