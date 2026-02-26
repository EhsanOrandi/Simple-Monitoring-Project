
import { Injectable } from '@angular/core';
import { MonitoringProvider } from './provider';

// import { ToastrModule, ToastrService } from 'ngx-toastr';


import { User } from './user';

@Injectable()
export class dataProvider {
    // public serverUrl : string = "http://"+window.location.host.split(':')[0]+"/api/";
    public serverUrl: string = "/api";
    private db: string = "NothingImportant";
    private google_apis_distance_matrix_url: string = "https://maps.googleapis.com/maps/api/distancematrix/json";
    private google_apis_key: string = "AIzaSyBJl7AtjRUvs2xH0AudJtaDv9Q8WcidHjE"
    public toastr_configs:any={"timeOut": 5000, "closeButton": false, "toastClass": "ngx-toastr", "positionClass": "toast-bottom-right", "progressBar": true}

    constructor(
        // private http: HTTP,
        // public MonitoringRPC: AlarmrpcProvider,
        public MonitoringRPC: MonitoringProvider,
        // private toastr: ToastrService
    ) {
        this.MonitoringRPC.init({
            Monitoring_server: this.serverUrl
        });
    }

    isLoggedIn() {
        return this.MonitoringRPC.isLoggedIn();
    }

    login(username: string = "", password: string = "", ga: string = "") {
        var _self = this;
        this.MonitoringRPC.clearCookeis();
        return this.MonitoringRPC.login(this.db, username, password, ga).then(res => {
            if ('uid' in res && res.uid) {
                let usr: User = new User(
                    res.name,
                    res.username,
                    res.partner_id,
                    res.uid,
                    res.first_name,
                    res.last_name,
                    res.role,
                );
                // console.dir(JSON.stringify(usr))
                localStorage.setItem('current_user', JSON.stringify(usr));
            }
            return res;
        });
    }

    logout() {
        var _self = this;
        _self.MonitoringRPC.clearCookeis();
        this.MonitoringRPC.setNewSession('', '');
        return this.MonitoringRPC.sendJsonRequest("/api/logout", {});
    }

    // toastr functions

    // showSuccessToast(title:string, message:string) {
    //     this.toastr.success(message, title, this.toastr_configs);
    // }

    // showWarningToast(title:string, message:string) {
    //     this.toastr.warning(message, title, this.toastr_configs);
    // }

    // showInfoToast(title:string, message:string) {
    //     this.toastr.info(message, title, this.toastr_configs);
    // }

    // showErrorToast(title:string, message:string) {
    //     this.toastr.error(message, title, this.toastr_configs);
    // }

    ////
    //// Monitoring API 
    ////
    get_all_users() {
        return this.MonitoringRPC.sendJsonRequest("/api/get_users_list", {});
    }

    edit_existing_user(user_id:any, username:string, first_name:string, last_name:string, role:string) {
        var data = {
            "user_id": user_id,
            "username": username,
            "first_name": first_name,
            "last_name": last_name,
            "role": role
        }
        // return this.MonitoringRPC.sendJsonRequest("/api/edit_user", data);
        return fetch('/api/api/edit_user', {
            method: 'POST',
            headers: {'Content-Type': 'application/json',},
            body: JSON.stringify(data),
          })
          .then(response => response.json())  // Ensure response is parsed as JSON
          .catch(error => {
            console.error('Error during API call:', error);
            throw error;  // Rethrow error so it can be caught in the `.catch()` block
          });
    }

    change_password(user_id:any, password:string, confirm_password:string) {
        var data = {
            "user_id": user_id,
            "password": password,
            "confirm_password": confirm_password
        }
        // return this.MonitoringRPC.sendJsonRequest("/api/change_password", data);

        return fetch('/api/api/change_password', {
            method: 'POST',
            headers: {'Content-Type': 'application/json',},
            body: JSON.stringify(data),
          })
          .then(response => response.json())  // Ensure response is parsed as JSON
          .catch(error => {
            console.error('Error during API call:', error);
            throw error;  // Rethrow error so it can be caught in the `.catch()` block
          });
    }

    register_new_user(username:string, first_name:string, last_name:string, password:string, role:string) {
        var data = {
            "username": username,
            "fname": first_name,
            "lname": last_name,
            "password": password,
            "role": role
        }
        // return this.MonitoringRPC.sendJsonRequest("/api/signup", data);

        return fetch('/api/api/signup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json',},
            body: JSON.stringify(data),
          })
          .then(response => response.json())  // Ensure response is parsed as JSON
          .catch(error => {
            console.error('Error during API call:', error);
            throw error;  // Rethrow error so it can be caught in the `.catch()` block
          });
    }

    get_cities_list() {
        var data = {}
        return this.MonitoringRPC.sendJsonRequest("/api/get_cities_list", data);
    }

    get_counting_details(city_id:any) {
        var data = {
            "city_id": city_id
        }
        return this.MonitoringRPC.sendJsonRequest("/api/get_counting_details", data);
    }

    add_new_city(name:string, code:string) {
        var data = {
            "name": name,
            "code": code
        }
        return this.MonitoringRPC.sendJsonRequest("/api/add_new_city", data);
    }

    edit_city_record(record_id:any, name:string, code:string) {
        var data = {
            "record_id": record_id,
            "name": name,
            "code": code
        }
        return this.MonitoringRPC.sendJsonRequest("/api/edit_city_record", data);
    }

    get_routes_list(city_id:any) {
        var data = {
            "city_id": city_id
        }
        return this.MonitoringRPC.sendJsonRequest("/api/get_routes_list", data);
    }

    get_routes_details(city_id:any) {
        var data = {
            "city_id": city_id
        }
        return this.MonitoringRPC.sendJsonRequest("/api/get_routes_details", data);
    }

    get_single_route_details(route_id:any) {
        var data = {
            "route_id": route_id
        }
        return this.MonitoringRPC.sendJsonRequest("/api/get_single_route_details", data);
    }

    add_new_route(name:string, code:string, city_id:any) {
        var data = {
            "name": name,
            "code": code,
            "city_id": city_id
        }
        return this.MonitoringRPC.sendJsonRequest("/api/add_new_route", data);
    }

    edit_route_record(record_id:any, name:string, code:string, city_id:any) {
        var data = {
            "record_id": record_id,
            "name": name,
            "code": code,
            "city_id": city_id
        }
        return this.MonitoringRPC.sendJsonRequest("/api/edit_route_record", data);
    }


    get_sensors_list(route_id:any) {
        var data = {
            "route_id": route_id
        }
        return this.MonitoringRPC.sendJsonRequest("/api/get_sensors_list", data);
    }

    add_new_sensor(name:string, code:string, latitude:any, longitude:any, route_id:any) {
        var data = {
            "name": name,
            "code": code,
            "latitude": latitude,
            "longitude": longitude,
            "route_id": route_id
        }
        return this.MonitoringRPC.sendJsonRequest("/api/add_new_sensor", data);
    }

    edit_sensor_record(record_id:any, name:string, code:string, latitude:any, longitude:any, route_id:any) {
        var data = {
            "record_id": record_id,
            "name": name,
            "code": code,
            "latitude": latitude,
            "longitude": longitude,
            "route_id": route_id
        }
        return this.MonitoringRPC.sendJsonRequest("/api/edit_sensor_record", data);
    }

    get_city_sensors_list(city_id:any) {
        var data = {
            "city_id": city_id
        }
        return this.MonitoringRPC.sendJsonRequest("/api/get_city_sensors_list", data);
    }

    get_route_data_values(route_id: any, start_date: string, end_date:string, delta: string) {
        var data = {
            "route_id": route_id,
            "start_date": start_date,
            "end_date": end_date,
            "delta": delta
        }
        return this.MonitoringRPC.sendJsonRequest("/api/get_route_data_values", data);   
    }


    ////
    //// End api funcs
    ////
    setupSession(context: any, session: any) {
        this.MonitoringRPC.clearCookeis();
        this.MonitoringRPC.setNewSession(context, session);
    }

    signupUser(username: string, partner_id: number) {
        let options = [{
            login: username,
            partner_id: partner_id,
            company_id: 1,
            active: false
        }];
        // return this.MonitoringRPC.call('res.users', 'create', options, null);
    }

    verifyPhone(phone: string, action: string = "signup") {
        let data = {
            "phone_number": phone,
            "action": action,
            // "gateway": gateway,
        };
        return this.MonitoringRPC.sendRequest("/user/signup/send_code", data).then(result => {
            try {
                return JSON.parse(result.result);
            }
            catch (e) {
                return result;
            }
        });
    }

    verifyCode(uid: any, code: any, action: string = "signup") {
        var _self = this;
        let data = {
            "phone_number": uid,
            "code": code,
            "get_uid": true,
            "action": action
        };
        return this.MonitoringRPC.sendRequest("/user/signup/verify_code", data);
    }

    checkSessionExpired(error: any) {
        console.log(error);
        if ('title' in error && error.title == "session_expired")
            this.logout();
        return Promise.reject(error.message || error);
    }


    setSession(context: any, session_id: any) {
        this.MonitoringRPC.setNewSession(context, session_id);
    }

    getSessionInfo() {
        return this.MonitoringRPC.getSessionInfo();
    }

    checkVersion(version: string) {
        let data = {
            'version': version,
        };
        return this.MonitoringRPC.sendRequest("/app/check_version", data);
    }

    getFullUrl(url: any) {
        return this.serverUrl + url;
    }
}
