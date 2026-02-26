import { Injectable, Inject } from '@angular/core';

import { HttpClient,HttpResponse  } from '@angular/common/http';

import { Router } from '@angular/router';

class Cookies { // cookies doesn't work with Android default browser / Ionic
	private session_id: string = "";

	delete_sessionId() {
		this.session_id = "";
		document.cookie = "";
	}

	get_sessionId() {
		return document
			.cookie.split("; ")
			.filter(x => { return x.indexOf("session_id") === 0; })
			.map(x => { return x.split("=")[1]; })
			.pop() || this.session_id || "";
	} 

	set_sessionId(val: string) {
		// document.cookie = `session_id=${val}`;
		// this.session_id = val;
	}
}

@Injectable()
export class MonitoringProvider {

	private Monitoring_server: string="";
	private http_auth: string="";
	private cookies: Cookies;
	private uniq_id_counter: number = 0;
	private shouldManageSessionId: boolean = false; // try without first
	private context: Object = {"lang": "fa_IR"};
	private headers: any;

	constructor(private http: HttpClient, private router: Router) {
		this.cookies = new Cookies();
	}

	private buildRequest(url: string, params: any) {
		this.uniq_id_counter += 1;
		if (this.shouldManageSessionId) {
			params.session_id = this.cookies.get_sessionId();
		}

		this.headers = {
			"Content-Type": "application/json",
			"Session-Id": this.cookies.get_sessionId(),
			"Authorization": "Basic " + btoa(`${this.http_auth}`)
		};
		return params;
	}

	private handleMonitoringErrors(response: any) {
		//response = JSON.parse(response.data);
		if (!response.error) {
			if (typeof response.result === 'string' || response.result instanceof String)
				return JSON.parse(response.result);
			return response.result;
		}

		let error = response.error;
		let errorObj = {
				title: "    ",
				message: "",
				fullTrace: error
		};
		return Promise.reject(error);
	}

	private handleRequestErrors(response: any) {
	    if (!response.error) {
				if (typeof response.result === 'string' || response.result instanceof String)
					return JSON.parse(response.result);
	      return response.result;
	    }

	    let error = response.error;
	    let errorObj = {
	        title: "    ",
	        message: "",
	        fullTrace: error
	    };
	    return Promise.reject(error);
	}

	private handleHttpErrors = (error: any) => {
		try{
			console.log(error, Object.getOwnPropertyNames(error));
		}
		catch(e){
			console.log(error);
		}		
		if (error.status === 401) {  // Unauthorized error
			error.message = "لطفا وارد حساب کاربری خود شوید."
			this.router.navigate(['/login']); // Redirect to login page
		}
		return Promise.reject(error.message || error);
	}

	public init(configs: any) {
		this.Monitoring_server = configs.Monitoring_server;
		this.http_auth = configs.http_auth || null;
	}

	public setMonitoringServer(Monitoring_server: string) {
		this.Monitoring_server = Monitoring_server;
	}

	public setHttpAuth(http_auth: string) {
		this.http_auth = http_auth;
	}
  public sendRequestauth(url: string, params: Object){ 
    let body = this.buildRequest(url, params);
	console.dir(body);
	return this.http.post(this.Monitoring_server + url, body, {observe: "response",headers: this.headers,withCredentials:true});
  }
  public sendRequest(url: string, params: Object): Promise<any> {
    let body = this.buildRequest(url, params);
    return this.http.post(this.Monitoring_server + url, body, {headers: this.headers,withCredentials:true})
        .toPromise()
		.then((response: any) => this.handleMonitoringErrors(response))
		.catch((response: any) => this.handleHttpErrors(response));
	}

	public sendJsonRequest(url: string, params: Object) {
		let headers = {
			"Content-Type": "application/json",
		};
		// this.http.setDataSerializer('json');
    return this.http.post(this.Monitoring_server + url, params,
       {headers:this.headers,withCredentials:true}
      ).toPromise()
			.then(this.handleRequestErrors)
			.catch(this.handleHttpErrors);
	}
	
	public sendHttpRequest(url: string, params: any) {
		let headers = {
			"Content-Type": "application/x-www-form-urlencoded",
		};
		// this.http.setDataSerializer('urlencoded');
	    return this.http.post(this.Monitoring_server + url, params, 
	      {headers:headers,withCredentials:true}
	    ).toPromise()
			.then(this.handleRequestErrors)
			.catch(this.handleHttpErrors);
	}
	public sendHttpGetRequest(url: string) {
		let headers = {
			"Content-Type": "application/x-www-form-urlencoded",
		};
		// this.http.setDataSerializer('urlencoded');
	    return this.http.get(this.Monitoring_server + url, 
	      {headers:headers,withCredentials:true}
	    ).toPromise()
			.then(this.handleRequestErrors)
			.catch(this.handleHttpErrors);
	}

	public getServerInfo() {
		return this.sendRequest("/api/version_info", {});
	}

	public getSessionInfo() {
		return this.sendRequest("/api/me", {});
	}
	//Set-Cookie
	public login(db: string, login: string, password: string, ga: string) {
		let params = { 
			username : login,
			password : password,
			// token: token,
			// ga: ga
		};
		let $this = this;
		return this.sendRequest("/api/login", params);
	}

	public isLoggedIn() {
		return this.getSessionInfo().then(function(result: any) {
			if ( "uid" in result === false ) return false;
			else return true;
		});
	}

	public clearCookeis() {
		this.cookies = new Cookies();
	}

	public logout() {
		this.clearCookeis();
		return Promise.resolve();
	}



	public getUserContext(context: any) {
		localStorage.setItem("user_context", JSON.stringify(context));

	}

	public getContext() {
		return this.context;
	}



	public setNewSession(user_context: any, session_id: any) {
			this.context = user_context;
			localStorage.setItem("user_context", JSON.stringify(this.context));
			// this.cookies.set_sessionId(session_id);
	}
}
