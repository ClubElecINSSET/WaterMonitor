"""Read sensor frames from the XBee and store them in MariaDB.

Frame layout (see ESP32/main/sendToXbee.cpp), 16 bytes:
  0xA0 | temp LSB, dec | pH LSB, dec | TDS MSB, LSB, dec
       | conductivity MSB, LSB, dec | oxygen MSB, LSB, dec | checksum | 0x0A
A first byte of 0xFF for a value means the sensor reported an error.
"""

import os
import time

FRAME_SIZE = 16
START_BYTE = 0xA0
END_BYTE = 0x0A
ERROR_BYTE = 0xFF

# (column, offset of first byte, number of bytes incl. decimal byte)
FIELDS = (
    ("Temperature", 1, 2),
    ("pH", 3, 2),
    ("TDS", 5, 3),
    ("Conductivity", 8, 3),
    ("Oxygen", 11, 3),
)


def decode_frame(frame):
    """Return {column: float or None} for a valid frame, or None if it is corrupt."""
    if len(frame) != FRAME_SIZE or frame[0] != START_BYTE or frame[-1] != END_BYTE:
        return None
    if sum(frame[1:-2]) % 0x100 != frame[-2]:
        return None

    values = {}
    for column, offset, size in FIELDS:
        raw = frame[offset : offset + size]
        if raw[0] == ERROR_BYTE:
            values[column] = None
            continue
        if size == 3:
            integer = raw[0] * 256 + raw[1]
        elif column == "Temperature" and raw[0] & 0x80:
            integer = raw[0] - 256  # signed byte
        else:
            integer = raw[0]
        decimal = raw[-1] / 100
        values[column] = round(integer - decimal if integer < 0 else integer + decimal, 2)
    return values


def frames(chunks):
    """Yield decoded values from a stream of byte chunks, resyncing on corrupt data."""
    buf = bytearray()
    for chunk in chunks:
        buf += chunk
        while True:
            start = buf.find(START_BYTE)
            if start < 0:
                buf.clear()
                break
            del buf[:start]
            if len(buf) < FRAME_SIZE:
                break
            values = decode_frame(bytes(buf[:FRAME_SIZE]))
            if values is None:
                print("Corrupt frame, skipped", flush=True)
                del buf[0]  # the next frame may start inside this one
                continue
            del buf[:FRAME_SIZE]
            yield values


def main():
    import mysql.connector
    import serial

    columns = [column for column, _, _ in FIELDS]
    query = "INSERT INTO Data ({}) VALUES ({})".format(", ".join(columns), ", ".join(["%s"] * len(columns)))

    db = None
    port = serial.Serial(os.getenv("SERIAL_PORT", "/dev/ttyUSB0"), 9600, timeout=3)
    print("Listening on", port.port, flush=True)

    chunks = iter(lambda: port.read(FRAME_SIZE), None)  # read() returns b"" on timeout, never None
    for values in frames(chunks):
        print(values, flush=True)

        try:
            if db is None or not db.is_connected():
                db = mysql.connector.connect(
                    host=os.getenv("DB_HOST", "localhost"),
                    unix_socket=os.getenv("DB_SOCKET"),  # set by install.sh; overrides host
                    database=os.environ["DB_NAME"],
                    user=os.environ["DB_USER"],
                    password=os.environ["DB_PASS"],
                    autocommit=True,
                )
            with db.cursor() as cursor:
                cursor.execute(query, [values[c] for c in columns])
        except mysql.connector.Error as err:
            # Lose this measure but keep reading; reconnect on the next one
            print("Database error:", err, flush=True)
            db = None
            time.sleep(1)


if __name__ == "__main__":
    main()
