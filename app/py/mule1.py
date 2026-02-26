#!/usr/bin/python
# -*- coding: utf-8 -*-

# mule1.py: independent worker process
#   - a TCP server as an excurrencyle

import socket
import threading
import time
import os
import requests
from pathlib import Path
import json
from datetime import datetime
from db import City, Route, Sensor
from flask_socketio import SocketIO
import config
from playhouse.postgres_ext import PostgresqlExtDatabase, ArrayField, BinaryJSONField, BooleanField, JSONField
# support for arrays of uuid
import psycopg2.extras
psycopg2.extras.register_uuid()

database = PostgresqlExtDatabase(config.DATABASE_NAME,
    user=config.DATABASE_USER, password=config.DATABASE_PASSWORD,
    host=config.DATABASE_HOST, port=config.DATABASE_PORT)

import logging
log = logging.getLogger("mule")

# socketio = SocketIO(message_queue='redis://localhost:6379/2')
disconnect_counts = 0

class ThreadedTCPServer(object):
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind((self.host, self.port))

    def listen(self):
        self.sock.listen(5)
        while True:
            client, address = self.sock.accept()
            log.error("client: {}".format(client))
            log.error("ADDress: {}".format(address))
            client.settimeout(60)
            threading.Thread(target = self.listenToClient, args = (client,address)).start()

    def listenToClient(self, client, address):
        size = 4096
        buffer = ""
        while True:
            try:
                data = client.recv(size)
                log.error("Got Data: {}".format(data))
                if not data:
                    break

                buffer += data.decode("utf-8")

                while True:
                    try:
                        start = buffer.find("#")
                        end = buffer.find("%")

                        # Not a complete frame
                        if start == -1 or end == -1 or end < start:
                            break

                        # extract full frame
                        frame = buffer[start:end + 1]
           
                        # removed proccessed part
                        buffer = buffer[end + 1:]

                        self.process_frame(frame)

                    except Exception as error:
                        if 'connection already closed' in str(error):
                            disconnect_counts += 1
                            if disconnect_counts > 4:
                                disconnect_counts = 0
                                Path('/app/reload').touch()
                        log.error("Error: {} - Data: {}".format(error, data))
              
            except:
                client.close()
                return False

    def process_frame(self, frame):
        log.error("Detected Frame: {}".format(frame))
        sensors_data = []
        if frame.startswith("#") and frame.endswith("%"):
            frame = frame[1:][:-1]
            sensors = frame.split("\r\n")
            log.error("Sensors: {}".format(sensors))
            if not len(sensors):
                log.error("No sensor data!!! - {}".format(frame))
                return False
            city_code = False
            route_code = False
            function_data = {}
            for idx, item in enumerate(sensors):
                item_data = item.split(":")
                item_key = item_data[2].replace("'", "")
                value_str = item_data[3].replace("'", "")
                item_value = float(value_str)
                # item_value = float(item_data[3])
                if item_key == 'TEMP':
                    function_data['temperature'] = item_value
                else:
                    sensors_data.append({"sensor_code": item_key, "sensor_value": item_value})
                if idx == 0:
                    city_code = item_data[0]
                    route_code = item_data[1]
            function_data['sensors'] = sensors_data
            process_result = Sensor.handle_received_data(city_code, route_code, function_data)
            if process_result and process_result['result']:
                requests.post(
                    "http://localhost:5000/internal/sensor-update",
                    json={"city_code": city_code, "route_id": process_result['route_id']}
                )
            
            return True
        else:
            log.error("Invalid Frame!!! - {}".format(frame))
            return False



def main():
    """Controller main function"""
    tcp_server = ThreadedTCPServer('0.0.0.0', 8502)

    t = threading.Thread(target=tcp_server.listen)
    t.start()
    log.info("TCP listener started.")
    t.join() 




if __name__ == '__main__':
    main()

