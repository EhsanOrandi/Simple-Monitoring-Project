#!/usr/bin/python
# -*- coding: utf-8 -*-

# red.py: read/write data in Redis
#   - get/set key values with expiration time
#   - simple list operations
#   - atomic increment, getset
#
# Note: stores pickled data in Redis. If you want to interoperate with the
# data with other tools, you'd better change pickle to json (a bit slower
# but interoperates better).
#
# https://redis.io/commands
# https://github.com/andymccurdy/redis-py
#
# Author: Tomi.Mickelsson@iki.fi

import redis
import pickle
import datetime
import time
from collections import defaultdict

import config

import logging
log = logging.getLogger("RedisDB")

DAY_MS   = 24 * 60 * 60 * 1000
WEEK_MS  = 7  * DAY_MS
MONTH_MS = 30 * DAY_MS   # تقریبی


class RedisDB:

    def __init__(self, city_id, route_id):
        self.city_id = city_id
        self.route_id = route_id
        self.r = redis.Redis(host='localhost', port=6379, db=0)
        # retention
        self.raw_retention   = 2 * 365 * DAY_MS      # 2 years
        self.agg_retention   = 5 * 365 * DAY_MS      # 5 years

    # ------------------------------------------------------------------
    # key helpers

    def _temp_key(self):
        return f"ts:{self.city_id}:{self.route_id}:temp"

    def _hum_key(self, sensor_id):
        return f"ts:{self.city_id}:{self.route_id}:hum:{sensor_id}"

    def _agg_key(self, base, period):
        return f"{base}:avg:{period}"

    # ------------------------------------------------------------------
    # create timeseries

    def create_temperature_series(self):
        base = self._temp_key()
        self._create_base_series(base)
        self._create_aggregates(base)

    def create_humidity_series(self, sensor_id):
        base = self._hum_key(sensor_id)
        self._create_base_series(base)
        self._create_aggregates(base)

    def _create_base_series(self, key):
        try:
            self.r.ts().create(
                key,
                retention_msecs=self.raw_retention,
                duplicate_policy="last",
                labels={
                    "city": self.city_id,
                    "route": self.route_id
                }
            )
        except Exception:
            self.r.ts().alter(key, retention_msecs=self.raw_retention)

    def _create_aggregates(self, base_key):
        rules = {"1d": DAY_MS, "1w": WEEK_MS, "1m": MONTH_MS}

        for period, bucket in rules.items():
            agg_key = self._agg_key(base_key, period)
            try:
                self.r.ts().create(agg_key, retention_msecs=self.agg_retention, duplicate_policy="last")
            except Exception:
                pass

            try:
                self.r.ts().createrule(base_key, agg_key, aggregation_type="avg", bucket_size_msec=bucket)
            except Exception:
                pass

    def _ensure_series(self, create_fn):
        try:
            create_fn()
        except Exception:
            pass


    # ------------------------------------------------------------------
    # add data

    def add_temperature(self, value, timestamp=False):
        if not timestamp:
            timestamp = int(time.time() * 1000) # milliseconds
        self._ensure_series(self.create_temperature_series)
        self.r.ts().add(self._temp_key(), timestamp, value)

    def add_humidity(self, sensor_id, value, timestamp=False):
        if not timestamp:
            timestamp = int(time.time() * 1000) # milliseconds
        self._ensure_series(lambda: self.create_humidity_series(sensor_id))
        self.r.ts().add(self._hum_key(sensor_id), timestamp, value)

    def add_humidity_bulk(self, items, timestamp=False):
        """items: list of (sensor_id, value)"""
        if not items:
            return

        if not timestamp:
            timestamp = int(time.time() * 1000) # milliseconds

        datalist = []
        for sensor_id, value in items:
            # ensure TS exists (lazy)
            try:
                self.create_humidity_series(sensor_id)
            except Exception:
                pass

            datalist.append((self._hum_key(sensor_id), timestamp, value))

        self.r.ts().madd(datalist)


    # ------------------------------------------------------------------
    # read data

    def range(self, key, start_dt, end_dt, delta="raw"):
        """
        Output: list of (timestamp, value)
        """

        start_ms = int(start_dt.timestamp() * 1000)
        end_ms   = int(end_dt.timestamp() * 1000)

        if delta == "raw":
            final_key = key
        else:
            final_key = f"{key}:avg:{delta}"

        data = self.r.ts().range(final_key, start_ms, end_ms)

        return [(int(ts), float(val)) for ts, val in data]


    def get_route_range(self, sensor_ids, start_dt, end_dt, delta="raw"):
        """
        Output: list of dict:
        [{"ts": 1676500000000, "temperature": 20.5, "humidity": {1: 68.2, 2: 67.1}}, ...]
        """

        round_to_ms = 1000

        start_ms = int(start_dt.timestamp() * 1000)
        end_ms   = int(end_dt.timestamp() * 1000)

        # --- Temperature ---
        temp_key = self._temp_key()
        temp_data = self.range(temp_key, start_dt, end_dt, delta)  # list of (ts, value)
        temp_dict = { (ts // round_to_ms) * round_to_ms : val for ts, val in temp_data }
        # temp_dict = dict(temp_data)  # Convert to dict to speedup

        # --- Humidities ---
        hum_dicts = {}
        for sid in sensor_ids:
            hum_key = self._hum_key(sid)
            hum_data = self.range(hum_key, start_dt, end_dt, delta)
            hum_dicts[sid] = { (ts // round_to_ms) * round_to_ms : val for ts, val in hum_data }
            # hum_dicts[sid] = dict(hum_data)  # ts -> value

        # --- merge ---
        merged = []
        for ts in sorted(temp_dict.keys()):
            entry = {"ts": ts, "temperature": temp_dict[ts], "humidity": {}}
            for sid in sensor_ids:
                val = hum_dicts.get(sid, {}).get(ts)
                if val is not None:
                    entry["humidity"][sid] = val
            merged.append(entry)

        return merged


    def last(self, key):
        return self.r.ts().get(key)

    def last_route_snapshot(self, sensor_ids):
        result = {"temperature": None, "humidity": {}}
        # temperature
        try:
            temp = self.last(self._temp_key())
            if temp:
                result["temperature"] = {"ts": temp[0], "value": temp[1]}
        except Exception as e:
            log.error(f"Failed to read temperature TS: {e}")

        # humidity sensors
        for sensor_id in sensor_ids:
            try:
                hum = self.last(self._hum_key(sensor_id))
                if hum:
                    result["humidity"][sensor_id] = {"ts": hum[0], "value": hum[1]}
            except Exception as e:
                log.error(f"Failed to read humidity TS ({sensor_id}): {e}")

        return result


