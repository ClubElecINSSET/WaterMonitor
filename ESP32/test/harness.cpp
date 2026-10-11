// Reads "pH conductivity temperature oxygen tds" ADC values per line on stdin, polls the sensors
// like main.ino and prints the computed values (frame order, "nan" if in error) then the frame in hex.
#include <cstdio>
#include "PhSensor.h"
#include "Temperature.h"
#include "tdsSensor.h"
#include "ConductivitySensor.h"
#include "Oxygen.h"
#include "sendToXbee.h"

FakeSerial     Serial;
int            g_adc[8];
static MCP3008 mcp(0, 0, 0, 0);
MCP3008 *const Sensor::s_mcp = &mcp;

static void show(const Sensor &s) { printf("%f ", s.isValueWrong() ? NAN : s.getValue()); }

int main()
{
    while (scanf("%d %d %d %d %d", &g_adc[0], &g_adc[1], &g_adc[2], &g_adc[3], &g_adc[4]) == 5)
    {
        PhSensor           ph(0);
        TemperatureSensor  temperature(2);
        tdsSensor          tds(4, temperature);
        ConductivitySensor conductivity(1, temperature);
        OxygenSensor       oxygen(3, temperature);
        temperature.poll();
        ph.poll();
        tds.poll();
        conductivity.poll();
        oxygen.poll();

        show(temperature);
        show(ph);
        show(tds);
        show(conductivity);
        show(oxygen);
        printf("\n");
        Serial.out.clear();
        sendToXbee(ph, temperature, tds, conductivity, oxygen);
        for (uint8_t b : Serial.out)
            printf("%02x", b);
        printf("\n");
    }
}
