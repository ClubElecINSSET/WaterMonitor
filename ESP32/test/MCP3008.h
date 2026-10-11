// Fake ADC: channel values come from the test
#pragma once
extern int g_adc[8];
class MCP3008
{
public:
    MCP3008(int, int, int, int) {}
    int readADC(int channel) { return g_adc[channel]; }
};
