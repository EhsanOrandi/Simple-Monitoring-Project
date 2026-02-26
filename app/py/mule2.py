#!/usr/bin/python
# -*- coding: utf-8 -*-

import socket
import time
import random
import logging

HOST = '127.0.0.1'   # IP mule اصلی
PORT = 8502          # TCP port mule اصلی
INTERVAL = 180        # هر چند ثانیه دیتا بفرسته

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("fake-mule")

# -------------------------------
# Fake topology
CITIES = {
    "001": {
        "001": ["1", "2", "3", "4", "5", "6"],
        "002": ["1", "2", "3", "4"],
        "003": ["1", "2", "3", "4"],
        "004": ["1", "2", "3", "4"],
        "005": ["1", "2", "3", "4", "5"],
        "006": ["1", "2", "3", "4", "5", "6", "7"]
    }
}

# -------------------------------
def format_value(val: float) -> str:
    """
    23.5 -> '235'
    """
    return f"{val:.2f}"

def build_frame(city, route, sensors):
    temp = random.uniform(18, 35)
    temp_str = format_value(temp)

    sensors_part = []
    for s in sensors:
        hum = random.uniform(30, 80)
        sensors_part.append(f"{city}:{route}:'{s}':'{format_value(hum)}'")
    sensors_part_str = '\r\n'.join(sensors_part)
    return f"#{city}:{route}:'TEMP':'{temp_str}'\r\n{sensors_part_str}%"

# -------------------------------
def send_frame(sock, frame):
    log.info(f"Sending frame: {frame}")
    sock.sendall(frame.encode())

# -------------------------------
def main():
    time.sleep(10)
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect((HOST, PORT))

            for city, routes in CITIES.items():
                for route, sensors in routes.items():
                    frame = build_frame(city, route, sensors)
                    send_frame(sock, frame)
                    time.sleep(0.5)  # فاصله بین routeها

            sock.close()
            time.sleep(INTERVAL)

        except Exception as e:
            log.error(f"Error: {e}")
            time.sleep(5)

# -------------------------------
if __name__ == "__main__":
    log.info("Starting fake mule...")
    main()
