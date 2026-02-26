#!/usr/bin/python
# -*- coding: utf-8 -*-

# api.py: REST API for monitoring
#   - this module is just demonstrating how to handle basic CRUD
#   - GET operations are available for visitors, editing requires login

# Author: Tomi.Mickelsson@iki.fi

from flask import request, jsonify, g, Response
from playhouse.shortcuts import dict_to_model, update_model_from_dict, model_to_dict
import account
import webutil
import db
import util
from webutil import app, login_required, get_myself, buildResponse
import time
from datetime import datetime
import json

import logging
log = logging.getLogger("api.monitoring")

# ---
# @app.route('/api/get_users_list', methods=['POST'])
# @login_required()
# def get_users_list():
#     """Get list of users"""
#     try:
#         res = {'success': False}
#         users = db.User.select(db.User.id, db.User.username, db.User.first_name, db.User.last_name, db.User.role, db.User.created).dicts()
#         res['success'] = True
#         res['params'] = {'users_list': users or []}
#         return buildResponse(res)
#     except Exception as e:
#         log.error("Error in get_users_list: {}".format(e))
#         return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")


@app.route('/api/get_counting_details', methods=['POST'])
# @login_required()
def get_counting_details():
    """Returns number of objects"""
    try:
        input = request.json or {}
        res = {'success': False}
        city_id = input.get("city_id")

        if not city_id:
            return buildResponse(res, error="شهر موردنظر را انتخاب نمایید.") 
        
        routes_count = db.Route.get_city_routes_count(city_id)
        sensors_count = db.Sensor.get_city_sensors_count(city_id)

        res['success'] = True
        res['params'] = {'routes_count': routes_count, "sensors_count": sensors_count}
        return buildResponse(res)
    except Exception as e:
        log.error("Error in get_counting_details: {}".format(e))
        return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")


@app.route('/api/get_cities_list', methods=['POST'])
# @login_required()
def get_cities_list():
    """Returns list of cities"""
    try:
        input = request.json or {}
        res = {'success': False}
        
        cities_list = db.City.select().order_by(db.City.name).dicts()

        res['success'] = True
        res['params'] = {'cities_list': cities_list or []}
        return buildResponse(res)
    except Exception as e:
        log.error("Error in get_cities_list: {}".format(e))
        return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")


@app.route('/api/add_new_city', methods=['POST'])
# @login_required()
def add_new_city():
    """Submit and add new city record"""
    try:
        input = request.json or {}
        res = {'success': False}
        name = input.get("name")
        code = input.get("code")

        if not name or not code:
            return buildResponse(res, error="داده ارسالی ناقص می باشد.")
        
        # me = get_myself()
        # if not me:
        #     return buildResponse(res, error="برای ثبت شهر جدید باید وارد حساب کاربری خود شوید.")
        # if me.role not in ['superuser', 'admin']:
        #     return buildResponse(res, error="شما مجاز به افزودن شهر جدید نیستید.")

        details = {"name": name, "code": code}

        new_rec = db.City.create(**details)
        if not new_rec:
            return buildResponse(res, error="خطا در افزودن شهر جدید")
        res['success'] = True
        return buildResponse(res)
    except Exception as e:
        log.error("Error in add_new_city: {}".format(e))
        return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")

@app.route('/api/edit_city_record', methods=['POST'])
# @login_required()
def edit_city_record():
    """Edit existing city record"""
    try:
        input = request.json or {}
        res = {'success': False}
        record_id = input.get("record_id")
        name = input.get("name")
        code = input.get("code")

        if not record_id or not name or not code:
            return buildResponse(res, error="داده ارسالی ناقص می باشد.")
        
        # me = get_myself()
        # if not me:
        #     return buildResponse(res, error="برای ویرایش رکورد باید وارد حساب کاربری خود شوید.")
        # if me.role not in ['superuser', 'admin']:
        #     return buildResponse(res, error="شما مجاز به ویرایش رکورد نیستید.")

        edit_rec = db.City.update(name=name, code=code).where(db.City.id == int(record_id))
        result = edit_rec.execute()
        if not result:
            return buildResponse(res, error="خطایی هنگام ویرایش رکورد رخ داده است")
        
        res['success'] = True
        return buildResponse(res)
    except Exception as e:
        log.error("Error in edit_city_record: {}".format(e))
        return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")


@app.route('/api/get_routes_list', methods=['POST'])
# @login_required()
def get_routes_list():
    """Returns list of routes"""
    try:
        input = request.json or {}
        res = {'success': False}
        city_id = input.get("city_id")

        if not city_id:
            return buildResponse(res, error="شهر موردنظر را انتخاب نمایید.") 
        
        routes_list = db.Route.get_city_routes(int(city_id))

        res['success'] = True
        res['params'] = {'routes_list': routes_list or []}
        return buildResponse(res)
    except Exception as e:
        log.error("Error in get_routes_list: {}".format(e))
        return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")


@app.route('/api/get_routes_details', methods=['POST'])
# @login_required()
def get_routes_details():
    """Returns list of routes with details (sensors and data)"""
    try:
        input = request.json or {}
        res = {'success': False}
        city_id = input.get("city_id")

        if not city_id:
            return buildResponse(res, error="شهر موردنظر را انتخاب نمایید.") 
        
        routes_list = []
        route_ids = db.Route.get_city_routes_id(int(city_id))
        for route in route_ids:
            routes_list.append(db.Route.prepare_route_last_data(route['id']))

        res['success'] = True
        res['params'] = {'routes_list': routes_list or []}
        return buildResponse(res)
    except Exception as e:
        log.error("Error in get_routes_details: {}".format(e))
        return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")


@app.route('/api/get_single_route_details', methods=['POST'])
# @login_required()
def get_single_route_details():
    """Returns list of routes"""
    try:
        input = request.json or {}
        res = {'success': False}
        route_id = input.get("route_id")

        if not route_id:
            return buildResponse(res, error="مسیر موردنظر را انتخاب نمایید.") 
        
        route = db.get_object_or_none(db.Route, id=int(route_id))
        if not route:
            return buildResponse(res, error="مسیر موردنظر یافت نشد.") 
        route_details = db.Route.prepare_route_last_data(route_id)
        res['success'] = True
        res['params'] = {'route_details': route_details}
        return buildResponse(res)
    except Exception as e:
        log.error("Error in get_single_route_details: {}".format(e))
        return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")




@app.route('/api/add_new_route', methods=['POST'])
# @login_required()
def add_new_route():
    """Submit and add new route record"""
    try:
        input = request.json or {}
        res = {'success': False}
        name = input.get("name")
        code = input.get("code")
        city_id = input.get("city_id")

        if not name or not code or not city_id:
            return buildResponse(res, error="داده ارسالی ناقص می باشد.")
        
        # me = get_myself()
        # if not me:
        #     return buildResponse(res, error="برای ثبت شهر جدید باید وارد حساب کاربری خود شوید.")
        # if me.role not in ['superuser', 'admin']:
        #     return buildResponse(res, error="شما مجاز به افزودن شهر جدید نیستید.")

        details = {"name": name, "code": code, "city_id": city_id}

        city_exist = db.get_object_or_none(db.City, id=city_id)
        if not city_exist:
            return buildResponse(res, error="شهر مورد نظر یافت نشد")

        route_exist = db.Route.select().where(db.Route.code == code, db.Route.city_id == int(city_id))
        if route_exist:
            return buildResponse(res, error="مسیر مورد نظر قبلا ثبت شده است.")
            
        new_rec = db.Route.create(**details)
        if not new_rec:
            return buildResponse(res, error="خطا در افزودن مسیر جدید")
        res['success'] = True
        return buildResponse(res)
    except Exception as e:
        log.error("Error in add_new_route: {}".format(e))
        return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")

@app.route('/api/edit_route_record', methods=['POST'])
# @login_required()
def edit_route_record():
    """Edit existing route record"""
    try:
        input = request.json or {}
        res = {'success': False}
        record_id = input.get("record_id")
        name = input.get("name")
        code = input.get("code")
        city_id = input.get("city_id")

        if not record_id or not name or not code or not city_id:
            return buildResponse(res, error="داده ارسالی ناقص می باشد.")
        
        # me = get_myself()
        # if not me:
        #     return buildResponse(res, error="برای ویرایش رکورد باید وارد حساب کاربری خود شوید.")
        # if me.role not in ['superuser', 'admin']:
        #     return buildResponse(res, error="شما مجاز به ویرایش رکورد نیستید.")

        city_exist = db.get_object_or_none(db.City, id=city_id)
        if not city_exist:
            return buildResponse(res, error="شهر مورد نظر یافت نشد")

        route_exist = db.Route.select().where(db.Route.code == code, db.Route.city_id == int(city_id), db.Route.id != int(record_id))
        if route_exist:
            return buildResponse(res, error="مسیر با این کد برای این شهر قبلا ثبت شده است.")
        
        edit_rec = db.Route.update(name=name, code=code, city_id=int(city_id)).where(db.Route.id == int(record_id))
        result = edit_rec.execute()
        if not result:
            return buildResponse(res, error="خطایی هنگام ویرایش رکورد رخ داده است")
        
        res['success'] = True
        return buildResponse(res)
    except Exception as e:
        log.error("Error in edit_route_record: {}".format(e))
        return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")

@app.route('/api/get_sensors_list', methods=['POST'])
# @login_required()
def get_sensors_list():
    """Returns list of sensors"""
    try:
        input = request.json or {}
        res = {'success': False}
        route_id = input.get("route_id")

        if not route_id:
            return buildResponse(res, error="مسیر موردنظر را انتخاب نمایید.") 
        
        sensors_list = db.Sensor.get_route_sensors(int(route_id))

        res['success'] = True
        res['params'] = {'sensors_list': sensors_list or []}
        return buildResponse(res)
    except Exception as e:
        log.error("Error in get_sensors_list: {}".format(e))
        return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")


@app.route('/api/add_new_sensor', methods=['POST'])
# @login_required()
def add_new_sensor():
    """Submit and add new sensor record"""
    try:
        input = request.json or {}
        res = {'success': False}
        name = input.get("name")
        code = input.get("code")
        latitude = input.get("latitude")
        longitude = input.get("longitude")
        route_id = input.get("route_id")

        if not name or not code or not route_id:
            return buildResponse(res, error="داده ارسالی ناقص می باشد.")
        
        # me = get_myself()
        # if not me:
        #     return buildResponse(res, error="برای ثبت شهر جدید باید وارد حساب کاربری خود شوید.")
        # if me.role not in ['superuser', 'admin']:
        #     return buildResponse(res, error="شما مجاز به افزودن شهر جدید نیستید.")

        details = {"name": name, "code": code, "latitude": latitude, "longitude": longitude, "route_id": route_id}

        route_exist = db.get_object_or_none(db.Route, id=route_id)
        if not route_exist:
            return buildResponse(res, error="مسیر مورد نظر یافت نشد")

        sensor_exist = db.Sensor.select().where(db.Sensor.code == code, db.Sensor.route_id == int(route_id))
        if sensor_exist:
            return buildResponse(res, error="سنسور مورد نظر قبلا ثبت شده است.")
            
        new_rec = db.Sensor.create(**details)
        if not new_rec:
            return buildResponse(res, error="خطا در افزودن سنسور جدید")
        res['success'] = True
        return buildResponse(res)
    except Exception as e:
        log.error("Error in add_new_sensor: {}".format(e))
        return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")

@app.route('/api/edit_sensor_record', methods=['POST'])
# @login_required()
def edit_sensor_record():
    """Edit existing route record"""
    try:
        input = request.json or {}
        res = {'success': False}
        record_id = input.get("record_id")
        name = input.get("name")
        code = input.get("code")
        latitude = input.get("latitude")
        longitude = input.get("longitude")
        route_id = input.get("route_id")

        if not record_id or not name or not code or not route_id:
            return buildResponse(res, error="داده ارسالی ناقص می باشد.")
        
        # me = get_myself()
        # if not me:
        #     return buildResponse(res, error="برای ویرایش رکورد باید وارد حساب کاربری خود شوید.")
        # if me.role not in ['superuser', 'admin']:
        #     return buildResponse(res, error="شما مجاز به ویرایش رکورد نیستید.")

        route_exist = db.get_object_or_none(db.Route, id=route_id)
        if not route_exist:
            return buildResponse(res, error="مسیر مورد نظر یافت نشد")

        sensor_exist = db.Sensor.select().where(db.Sensor.code == code, db.Sensor.route_id == int(route_id), db.Sensor.id != int(record_id))
        if route_exist:
            return buildResponse(res, error="سنسور با این کد برای این مسیر قبلا ثبت شده است.")
        
        edit_rec = db.Sensor.update(name=name, code=code, latitude=latitude, longitude=longitude, route_id=int(route_id)).where(db.Sensor.id == int(record_id))
        result = edit_rec.execute()
        if not result:
            return buildResponse(res, error="خطایی هنگام ویرایش رکورد رخ داده است")
        
        res['success'] = True
        return buildResponse(res)
    except Exception as e:
        log.error("Error in edit_sensor_record: {}".format(e))
        return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")


@app.route('/api/get_city_sensors_list', methods=['POST'])
# @login_required()
def get_city_sensors_list():
    """Returns list of sensors of a specified city"""
    try:
        input = request.json or {}
        res = {'success': False}
        city_id = input.get("city_id")

        if not city_id:
            return buildResponse(res, error="شهر موردنظر را انتخاب نمایید.") 
        
        sensors_list = db.Sensor.get_city_sensors(int(city_id))

        res['success'] = True
        res['params'] = {'sensors_list': sensors_list or []}
        return buildResponse(res)
    except Exception as e:
        log.error("Error in get_city_sensors_list: {}".format(e))
        return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")


@app.route('/api/get_route_data_values', methods=['POST'])
# @login_required()
def get_route_data_values():
    """Returns all data of the specified route sensors within defined period"""
    try:
        input = request.json or {}
        res = {'success': False}
        route_id = input.get("route_id")
        start_date = input.get("start_date")
        end_date = input.get("end_date")
        delta = input.get("delta")

        if not route_id or not start_date or not end_date or not delta:
            return buildResponse(res, error="داده ارسالی ناقص می‌باشد.") 

        if delta not in ['live', 'daily', 'weekly', 'monthly']:
            return buildResponse(res, error="نوع گزارش گیری را انتخاب نمایید.") 

        start = datetime.strptime(start_date[:-1], "%Y-%m-%dT%H:%M:%S")
        end = datetime.strptime(end_date[:-1], "%Y-%m-%dT%H:%M:%S")
        today = datetime.now()
        if start >= end:
            return buildResponse(res,error="زمان آغاز نمی تواند بزرگتر از زمان پایان باشد.")
        if today <= start:
            return buildResponse(res,error="تاریخ های انتخابی نباید بزرگتر از تاریخ فعلی باشند.")
        
        values = db.Route.get_redis_data(int(route_id), start, end, delta)

        res['success'] = True
        res['params'] = {'data': values or []}
        return buildResponse(res)
    except Exception as e:
        log.error("Error in get_route_data_values: {}".format(e))
        return buildResponse({"success": False}, error="متاسفانه خطایی رخ داده است.")
