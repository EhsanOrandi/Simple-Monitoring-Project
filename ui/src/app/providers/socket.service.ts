import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket!: Socket;

  connect() {
    if (this.socket) return;

    this.socket = io('http://94.182.115.207:5000', {
      transports: ['websocket'],
      autoConnect: false
    });

    this.socket.connect();

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  joinCity(cityCode: string) {
    this.socket.emit('join_city', { city_code: cityCode });
  }

  onSensorUpdate(): Observable<any> {
    return new Observable(observer => {
      const handler = (data: any) => observer.next(data);

      this.socket.on('sensor_update', handler);

      // cleanup
      return () => {
        this.socket.off('sensor_update', handler);
      };
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = undefined as any;
    }
  }
}
