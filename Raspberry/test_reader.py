import unittest

from reader import decode_frame, frames


def frame(*payload):
    body = bytes(payload)
    return bytes([0xA0]) + body + bytes([sum(body) % 256, 0x0A])


class DecodeFrameTest(unittest.TestCase):
    def test_values(self):
        # 21.50 °C, pH 7.05, TDS 300.25, conductivity 410.10, oxygen 8.50
        values = decode_frame(frame(21, 50, 7, 5, 1, 44, 25, 1, 154, 10, 0, 8, 50))
        self.assertEqual(
            values,
            {
                "Temperature": 21.5,
                "pH": 7.05,
                "TDS": 300.25,
                "Conductivity": 410.1,
                "Oxygen": 8.5,
            },
        )

    def test_negative_temperature(self):
        values = decode_frame(frame(0xFB, 25, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0))  # -5.25 °C
        self.assertEqual(values["Temperature"], -5.25)

    def test_sensor_error_is_none(self):
        values = decode_frame(frame(21, 0, 0xFF, 0, 1, 0, 0, 0xFF, 0, 0, 0, 8, 0))
        self.assertIsNone(values["pH"])
        self.assertIsNone(values["Conductivity"])
        self.assertEqual(values["TDS"], 256.0)

    def test_corrupt_frames(self):
        good = frame(21, 50, 7, 5, 1, 44, 25, 1, 154, 10, 0, 8, 50)
        self.assertIsNone(decode_frame(good[:-1]))
        self.assertIsNone(decode_frame(b"\x00" + good[1:]))
        bad_checksum = good[:-2] + bytes([(good[-2] + 1) % 256]) + good[-1:]
        self.assertIsNone(decode_frame(bad_checksum))

    def test_stream_resyncs_after_garbage(self):
        good = frame(21, 50, 7, 5, 1, 44, 25, 1, 154, 10, 0, 8, 50)
        # garbage, a truncated frame, then a good frame split across two reads
        chunks = [b"\x01\x02" + good[:5] + good[:9], good[9:], b""]
        self.assertEqual(len(list(frames(chunks))), 1)


if __name__ == "__main__":
    unittest.main()
