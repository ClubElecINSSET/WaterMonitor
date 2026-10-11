#ifndef SENDTOXBEE_H
#define SENDTOXBEE_H

#include "PhSensor.h"
#include "Temperature.h"
#include "tdsSensor.h"
#include "ConductivitySensor.h"
#include "Oxygen.h"

void sendToXbee(const PhSensor &ph, const TemperatureSensor &temperature, const tdsSensor &tds,
                const ConductivitySensor &conductivity, const OxygenSensor &oxygen);

#endif