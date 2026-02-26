/// <reference types="@angular/localize" />
import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import '@majidh1/jalalidatepicker';

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));

declare global {
  interface Window {
    jalaliDatepicker: any;
  }
}
window.jalaliDatepicker.startWatch({
  minDate: 'attr',
  maxDate: 'today',
  time: true,
  zIndex: 999999999,
  hideAfterChange: true
});