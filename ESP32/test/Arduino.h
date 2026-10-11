// Minimal stand-in for the Arduino core, to build the firmware on a PC (see test_firmware.py)
#pragma once
#include <cmath>
#include <cstdint>
#include <vector>
using std::pow;
typedef bool boolean;
#define F(x) x

struct FakeSerial
{
    std::vector<uint8_t> out;
    void write(uint8_t b) { out.push_back(b); }
    template <class T> void print(T) {}
    template <class T> void println(T) {}
    void println() {}
};
extern FakeSerial Serial;
