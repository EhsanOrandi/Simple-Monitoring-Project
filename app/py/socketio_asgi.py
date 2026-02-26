#!/usr/bin/python
# -*- coding: utf-8 -*-

import logging
import socketio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

log = logging.getLogger("socketio_asgi")

# -----------------------------
# Socket.IO (ASGI)
# -----------------------------
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"
)

app = FastAPI()

# CORS (برای Angular)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# اتصال Socket.IO به FastAPI
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)


# -----------------------------
# Socket.IO events
# -----------------------------
@sio.event
async def connect(sid, environ):
    log.error(f"SOCKET CONNECTED: {sid}")
    await sio.emit("test_event", {"msg": "hello from ASGI"}, to=sid)


@sio.event
async def disconnect(sid):
    log.error(f"SOCKET DISCONNECTED: {sid}")


@sio.event
async def join_city(sid, data):
    city_code = data.get("city_code")
    if city_code:
        await sio.enter_room(sid, f"city_{city_code}")
        log.error(f"{sid} joined city_{city_code}")


# -----------------------------
# HTTP endpoint (from mule)
# -----------------------------
@app.post("/internal/sensor-update")
async def sensor_update(req: Request):
    payload = await req.json()
    city_code = payload.get("city_code")
    route_id = payload.get("route_id")

    if not city_code:
        return {"ok": False, "error": "city_code missing"}

    room = f"city_{city_code}"
    await sio.emit(
        "sensor_update",
        {
            "city_code": city_code,
            "route_id": route_id
        },
        room=room
    )
    log.error(f"EMIT sensor_update → {room}")
    return {"ok": True}
