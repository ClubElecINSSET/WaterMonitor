"""Builds the ESP32 firmware on the PC (g++, fake ADC) and checks its frames with the Pi's decoder.

    cd ESP32/test && python3 -m unittest test_firmware
"""
import math
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "Raspberry"))
from reader import FIELDS, decode_frame, frames  # noqa: E402

COLUMNS = [column for column, _, _ in FIELDS]  # frame order, same as the harness output
TEMP_25C = 250  # ADC value giving ~24.4 °C


@unittest.skipUnless(shutil.which("g++"), "g++ not installed")
class FirmwareTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.exe = pathlib.Path(cls.tmp.name) / "firmware"
        sources = [str(p) for p in (HERE.parent / "main").glob("*.cpp")]
        # Sanitizers make any out-of-bounds read or undefined behaviour abort the test
        subprocess.run(
            ["g++", "-std=gnu++17", "-g", "-fsanitize=address,undefined", "-fno-sanitize-recover=all",
             f"-I{HERE}", f"-I{HERE.parent / 'main'}", "-include", "Arduino.h",
             str(HERE / "harness.cpp"), *sources, "-o", str(cls.exe)],
            check=True,
        )

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def run_firmware(self, adc_sets):
        """[(pH, conductivity, temperature, oxygen, tds)] → [(computed {column: value}, frame bytes)]"""
        stdin = "".join(" ".join(map(str, s)) + "\n" for s in adc_sets)
        out = subprocess.run([str(self.exe)], input=stdin, capture_output=True, text=True, check=True)
        lines = out.stdout.splitlines()
        results = []
        for values, frame in zip(lines[::2], lines[1::2]):
            computed = {c: (None if math.isnan(float(v)) else float(v)) for c, v in zip(COLUMNS, values.split())}
            results.append((computed, bytes.fromhex(frame)))
        return results

    def test_every_adc_value_is_received_as_measured(self):
        sets = [(a, a, TEMP_25C, a, a) for a in range(1024)] + [(500, 300, t, 500, 300) for t in range(1024)]
        for computed, frame in self.run_firmware(sets):
            decoded = decode_frame(frame)
            self.assertIsNotNone(decoded, frame.hex())
            for column in COLUMNS:
                if computed[column] is None:
                    self.assertIsNone(decoded[column], column)
                elif computed[column] >= 0:  # negative temperatures: see test_negative_temperature
                    self.assertAlmostEqual(decoded[column], computed[column], delta=0.0051, msg=(column, frame.hex()))

    def test_rounding_carries_into_the_integer_part(self):
        # 6.996 must arrive as 7.00, not 6.00: look for such values in the sweep
        carried = [
            (c, decode_frame(f)) for c, f in self.run_firmware([(a, a, TEMP_25C, a, a) for a in range(1024)])
            if any(v is not None and v % 1 >= 0.995 for v in c.values())
        ]
        self.assertTrue(carried, "the sweep should contain values like x.995+")
        for computed, decoded in carried:
            for column, value in computed.items():
                if value is not None and value % 1 >= 0.995:
                    self.assertEqual(decoded[column], round(value, 2), column)

    def test_broken_temperature_sensor(self):
        for adc in (0, 1023):  # unplugged: reads far out of range
            computed, frame = self.run_firmware([(500, 300, adc, 500, 300)])[0]
            decoded = decode_frame(frame)
            self.assertIsNone(decoded["Temperature"])
            self.assertIsNone(decoded["Oxygen"])  # needs the temperature (and used to read out of bounds)
            self.assertIsNotNone(decoded["TDS"])  # uncompensated, as at 25 °C
            self.assertIsNotNone(decoded["Conductivity"])
            self.assertEqual(decoded["pH"], round(computed["pH"], 2))

    def test_negative_temperature(self):
        computed, frame = self.run_firmware([(500, 300, 117, 500, 300)])[0]  # ~ -2.5 °C
        self.assertLess(computed["Temperature"], 0)
        decoded = decode_frame(frame)
        self.assertIsNone(decoded["Oxygen"])  # DO_Table starts at 0 °C
        # Known limit: the frame carries no sign, -2.49 arrives as +2.49 (see CLAUDE.md)
        self.assertEqual(decoded["Temperature"], -round(computed["Temperature"], 2))

    def test_reader_resyncs_on_the_firmware_stream(self):
        stream = b"".join(f for _, f in self.run_firmware([(a, a, TEMP_25C, a, a) for a in range(0, 1024, 97)]))
        noisy = b"\x00\xa0boot garbage" + stream[:7] + stream  # partial frame, like an ESP32 reset mid-send
        chunks = [noisy[i:i + 5] for i in range(0, len(noisy), 5)]
        self.assertEqual(len(list(frames(chunks))), len(stream) // 16)


if __name__ == "__main__":
    unittest.main()
