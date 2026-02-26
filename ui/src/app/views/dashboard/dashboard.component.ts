import { DOCUMENT, NgStyle, CommonModule, JsonPipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, OnInit, OnDestroy, Renderer2, signal, WritableSignal, EventEmitter, ChangeDetectorRef  } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import {
  AvatarComponent,
  ButtonDirective,
  ButtonGroupComponent,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  FormCheckLabelDirective,
  GutterDirective,
  ProgressComponent,
  RowComponent,
  TableDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalHeaderComponent,
  ModalFooterComponent,
  ModalTitleDirective,
  ModalToggleDirective
} from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { dataProvider } from '../../providers/monitoring/data';
import { SocketService } from '../../providers/socket.service';
import { Subscription } from 'rxjs';
// import { IconDirective } from '@coreui/icons-angular';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import * as L from 'leaflet';
import { JalaliPipe } from '../../providers/jalali-pipe'
import * as echarts from 'echarts';
import jmoment from 'jalali-moment';
import moment from 'moment-timezone';

@Component({
  templateUrl: 'dashboard.component.html',
  styleUrls: ['dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, NgStyle, CardComponent, CardBodyComponent, RowComponent, ColComponent, ButtonDirective, ReactiveFormsModule, ButtonGroupComponent, FormCheckLabelDirective, ChartjsComponent, CardFooterComponent, GutterDirective, ProgressComponent, CardHeaderComponent, TableDirective, AvatarComponent, LeafletModule, JalaliPipe, ModalBodyComponent, ModalComponent, ModalHeaderComponent, ModalTitleDirective, ModalToggleDirective, ModalFooterComponent, ReactiveFormsModule, ButtonGroupComponent, FormCheckLabelDirective, ButtonDirective, FormsModule]
})
export class DashboardComponent implements OnInit, OnDestroy {
  constructor(
    private data_provider: dataProvider,
    private cdr: ChangeDetectorRef,
    private socketService: SocketService,
    private formBuilder: UntypedFormBuilder
  ) {
    var _self = this;
    // if (!this.login_checker.isLoggedIn()) {
        // 	setTimeout(function() {
    //     _self.router.navigate(['login']);
    //   }, 100);
        // }
  }
  private socketSub?: Subscription;
  public city_details:any = {};
  public routes_list:any = [];
  public sensors_list:any = [];
  public routes_count:Number=0;
  public sensors_count:Number=0;
  public colors = ['#FC0C04', '#F5BF0F', '#F2720C', '#740C08', '#10EDF5', '#34542C', '#2D11E9', '#150D0D'];  
  public routeLayerGroups = new Map<number, L.LayerGroup>();
  public chartInstance:any;
  public chart_modal_visible:boolean=false;
  public selected_route:any={route: {"name": ""}};
  public chart_start_date:any;
  public chart_end_date:any;

  delta_radio = new UntypedFormGroup({
    chart_delta: new UntypedFormControl('live')
  });

  options: L.MapOptions = {
    zoom: 13,
    center: L.latLng(38.055258093814444,46.315208491431775),
    layers: [
      // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO'
      })
    ]
  };

  layers: L.Layer[] = [];
  

  ngOnInit(): void {
    var _self = this;
    let aa: Window;
    _self.loadInitialData().then(() => {
      _self.socketService.connect();
      _self.socketService.joinCity(_self.city_details['code']);

      _self.socketSub = _self.socketService.onSensorUpdate().subscribe(async data => {
        let route_id = data['route_id'];
        await _self.updateRouteData(route_id);
        await _self.updateMapRoute(route_id);
      });
    });

  }

  async loadInitialData(): Promise<void> {
    var _self = this;
    let cities = await _self.data_provider.get_cities_list().then(res => {
      let params = res['params'];
      _self.city_details = params['cities_list'][0];
    })

    let counting = await _self.data_provider.get_counting_details(1).then(res => {
      let params = res['params'];
      _self.routes_count = params['routes_count'];
      _self.sensors_count = params['sensors_count'];
    })

    let routes = await _self.data_provider.get_routes_details(1).then(res => {
      let params = res['params'];
      _self.routes_list = params['routes_list'];
      _self.routes_list.forEach((item:any, index:any) => {
        item['color'] = _self.colors[index % _self.colors.length]
      });
    })

    let sensors = await _self.data_provider.get_city_sensors_list(1).then(res => {
      let params = res['params'];
      _self.sensors_list = params['sensors_list'];
    })

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '../../../assets/map_assets/images/marker-icon-2x.png',
      iconUrl: '../../../assets/map_assets/images/marker-icon.png',
      shadowUrl: '../../../assets/map_assets/images/marker-shadow.png',
    });

    _self.buildMapLayers();
    _self.cdr.detectChanges();
  }

  async buildMapLayers(): Promise<void> {
    this.layers = [];
    // this.routePolylines.clear();
    // this.routeMarkers.clear();

    this.routes_list.forEach((route:any) => {
      this.createRouteLayers(route);
    });
  }

  createRouteLayers(route: any) {
    var _self = this;
    let route_points = route['sensors'];
    if (route_points.length < 2)
      return;
    const group = L.layerGroup();
    // let route_points = _self.sensors_list.filter((item:any) => item.route_id == route.id);
    let latLngs: [number, number][] = route_points.map((s:any) => [s.latitude, s.longitude]);
    // Polyline مسیر
    const polyline = L.polyline(latLngs, {
      color: route.color,
      weight: 3,
      opacity: 1
    }).on('click', () => {
      console.log("");
      // this.routeSelected.emit(route.id);
    });
    group.addLayer(polyline)
    // _self.routePolylines.set(route.id, polyline);
    // _self.layers.push(polyline);

    //  مارکر یا circleMarker روی هر نقطه مسیر
    const markers: L.Marker[] = [];
    route_points.forEach((point:any, idx:any) => {
      group.addLayer(L.marker([point.latitude, point.longitude], {
        icon: L.divIcon({
          className: '',
          html: `
          <div style="text-align:center;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
              <!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.-->
              <path fill="${route.color}" d="M352 348.4C416.1 333.9 464 276.5 464 208C464 128.5 399.5 64 320 64C240.5 64 176 128.5 176 208C176 276.5 223.9 333.9 288 348.4L288 544C288 561.7 302.3 576 320 576C337.7 576 352 561.7 352 544L352 348.4zM328 160C297.1 160 272 185.1 272 216C272 229.3 261.3 240 248 240C234.7 240 224 229.3 224 216C224 158.6 270.6 112 328 112C341.3 112 352 122.7 352 136C352 149.3 341.3 160 328 160z"/>
            </svg>
            <div style="font-family: 'iransans'; font-size:15px; color:${route.color};">
              ${point.value || ""}
            </div>
          </div>
          `,
          iconSize: [24, 36],
          iconAnchor: [12, 20]
        })
      }).bindPopup(`<span>${route.route.name} - ${point.name}</span>`));

      // ذخیره‌ی group
      this.routeLayerGroups.set(route.route.id, group);

      // اضافه به layers (خیلی مهم)
      this.layers.push(group);
    });

    // 🔥 مهم برای Change Detection
    this.layers = [...this.layers];
  }

  async updateMapRoute(route_id:any): Promise<void> {
    var _self = this;
    let route = _self.routes_list.filter((item:any) => item['route']['id'] == route_id);
    if (!route.length)
      return;
    route = route[0];
      const group = this.routeLayerGroups.get(route_id);
    if (!group) return;

    // پاک کردن لایه‌های قبلی
    group.clearLayers();
    let sensors = route['sensors'];
    // polyline
    const latLngs = sensors.map((s:any) => [s.latitude, s.longitude] as [number, number]);
    group.addLayer(L.polyline(latLngs, {
      color: route.color,
      weight: 3
    }))
    

    // Remove old markers
    // const oldMarkers = _self.routeMarkers.get(route_id) || [];
    // oldMarkers.forEach(m => m.remove());

    // New markers
    // const newMarkers: L.Marker[] = [];

    sensors.forEach((point:any) => {
      group.addLayer(L.marker([point.latitude, point.longitude],
        { icon: L.divIcon({
          className: '',
          html: `
          <div style="text-align:center;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
              <!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.-->
              <path fill="${route.color}" d="M352 348.4C416.1 333.9 464 276.5 464 208C464 128.5 399.5 64 320 64C240.5 64 176 128.5 176 208C176 276.5 223.9 333.9 288 348.4L288 544C288 561.7 302.3 576 320 576C337.7 576 352 561.7 352 544L352 348.4zM328 160C297.1 160 272 185.1 272 216C272 229.3 261.3 240 248 240C234.7 240 224 229.3 224 216C224 158.6 270.6 112 328 112C341.3 112 352 122.7 352 136C352 149.3 341.3 160 328 160z"/>
            </svg>
            <div style="font-family: 'iransans'; font-size:15px; color:${route.color};">
              ${point.value || ""}
            </div>
          </div>
          `,
          iconSize: [24, 36],
          iconAnchor: [12, 20]
        }) }
      ).bindPopup(`<span>${route.route.name} - ${point.name}</span>`));

      // newMarkers.push(marker);
    });
    this.layers = [...this.layers];
  }


  async updateRouteData(route_id:any): Promise<void> {
    var _self = this;
    await _self.data_provider.get_single_route_details(route_id).then(res => {
      let params = res['params'];
      let route_details = params['route_details'];
      let route_index = _self.routes_list.findIndex((item:any) => item['route']['id'] == route_id);
      if (route_index !== -1) {
        route_details['color'] = _self.colors[route_index % _self.colors.length];
        _self.routes_list[route_index] = route_details;
        _self.cdr.detectChanges();
      }
    })
  }

  toggleChartModal(route:any=false) {
    var _self = this;
    if (route) {
      _self.selected_route = route;
    }
    _self.chart_start_date = "";
    _self.chart_end_date = "";
    _self.setDeltaRadioValue('live');
    if (_self.chartInstance) {
      _self.chartInstance.clear();
    }
    _self.chart_modal_visible = !_self.chart_modal_visible;
  }

  handleChartModal(event: any) {
    this.chart_modal_visible = event;
  }

  getChartData() {
    var _self = this;
    let start = _self.calendarDatesToGregorian(_self.chart_start_date) || "";
    let end = _self.calendarDatesToGregorian(_self.chart_end_date) || "";
    let delta = _self.delta_radio.get('chart_delta')?.value;
    if (_self.chartInstance) {
      _self.chartInstance.showLoading({
        text: "در حال دریافت اطلاعات ...",
        fontFamily: "iransans"
      })
    }
    _self.data_provider.get_route_data_values(_self.selected_route['route']['id'], start, end, delta).then(res => {
      let params = res['params'];
      _self.generateChartData(params['data']);        
    })
  }

  generateChartData(params: any): Promise<void> {
    var _self = this;
    let labels: any[] = [];
    let datasets: any[] = [];
    params.forEach((item: any) => {
      labels.push(jmoment(item['ts']).locale('fa').format('HH:mm:ss - YYYY/MM/DD')); 
      let temp_index = datasets.findIndex((item:any) => item['label'] == 'temperature');
      if (temp_index == -1)
        datasets.push({"label": "temperature", "value": [item['temperature'] || null] });
      else
        datasets[temp_index]['value'].push(item['temperature'] || null);
      if (item['humidity']) {
        for (const [key, value] of Object.entries(item['humidity'])) {
          let sensor_index = datasets.findIndex((item:any) => item['label'] == key);
          if (sensor_index == -1)
            datasets.push({"label": key, "value": [value || null] });
          else
            datasets[sensor_index]['value'].push(value || null);
        } 
      }
    })
    datasets.forEach((item: any) => {
      item["data"] = item['value'];
      item["tension"] = 0.2;
    })

    // Create the echarts instance
    let custom_series:any = [];
    datasets.forEach((item: any, index:any) => {
      custom_series.push({
        name: _self.getChartDataLabels(item['label']),
        type: 'line',
        symbol: 'none',
        sampling: 'lttb',
        // itemStyle: {
        //   color: _self.colors[index % _self.colors.length]
        // },
        data: item['data']
      })
    })
    if (!_self.chartInstance) {
      var dom_el = document.getElementById('chart_data');
      _self.chartInstance = echarts.init(dom_el);
    }

    let option = {
      tooltip: {
        trigger: 'axis',
        position: function (pt:any) {
          return [pt[0], '10%'];
        },
        className: "custom_chart_tooltip",
        formatter: function (params:any) {
          // params is an array of series
          // params[0].axisValue = Value of x-axis
          const encode = echarts.format.encodeHTML;
          const header = `<div class="selected_date">${encode(params[0].axisValue)}</div>`;
          const rows = params.map((p:any) => {
            return `
              <div class="series_container">
                <div class="series_info">
                  <span class="series_color" style="background:${encode(p.color)};"></span>
                  <span class="series_name">${encode(p.seriesName)}:</span>
                </div>
                <strong class="series_value">${encode(p.value)}</strong>
              </div>
            `;
          }).join('');

          return header + rows;
        }
      },
      title: {
        left: 'center',
        top: 'top',
        textStyle: {
          fontFamily: 'iransans'
        },
        subtextStyle: {
          fontFamily: 'iransans'
        }
      },
      toolbox: {
        feature: {
          restore: {},
          saveAsImage: {}
        }
      },
      legend: {top: "top", left: "3%", orient: 'vertical', textStyle: {fontFamily: 'iransans'}},
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels
      },
      yAxis: {
        type: 'value',
        max: function (value:any) {
            return Math.round(value.max * 1.15);
        },
        minInterval: 1,
        maxInterval: 5
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 10
        },
        {
          type: 'slider',
          start: 0,
          end: 10
        }
      ],
      series: custom_series
    };

    requestAnimationFrame(() => {
      _self.chartInstance.resize();
    });

    // Draw the chart
    _self.chartInstance.setOption(option);
    _self.chartInstance.hideLoading();
    return new Promise(resolve => {
      // وقتی رندر کامل شد
      _self.chartInstance.on('finished', () => {
        resolve();
      });
    })
  }

  getChartDataLabels(name:any) {
    var _self = this;
    if (name == "temperature")
      return "دما";
    if (!_self.selected_route)
      return "";
    let sensor_index = _self.selected_route['sensors'].findIndex((item:any) => item['id'] == name);
    if (sensor_index > -1) {
      let sensor = _self.selected_route['sensors'][sensor_index];
      return `${sensor.name}`;
    }
    else
      return name;
  }

  calendarDatesToGregorian(item:string) {
    if (item) {
      let persian_item = item.split(" ");
      let jstart = jmoment.from(persian_item[0], 'fa', 'YYYY-MM-DD').format('YYYY-MM-DD');
      if (persian_item.length == 1)
        return jstart;
      return moment.tz(jstart + " " + persian_item[1], "Asia/Tehran").utc().format();
    }
    else
      return false   
  }

  setDeltaRadioValue(value: string): void {
    this.delta_radio.setValue({ chart_delta: value });
  }

  ngOnDestroy(): void {
    this.socketSub?.unsubscribe();
    this.socketService.disconnect();
  }
}
