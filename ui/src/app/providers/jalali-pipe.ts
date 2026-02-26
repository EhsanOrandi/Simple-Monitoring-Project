import { Pipe, PipeTransform } from '@angular/core';
import jmoment from 'jalali-moment';
import moment from 'moment-timezone';

@Pipe({
  name: 'jalali',
  standalone: true
})
export class JalaliPipe implements PipeTransform {
  transform(value: any, args?: any): any {
    let MomentDate = moment.utc(value, 'YYYY/MM/DD HH:mm:ss').tz("Asia/Tehran")
    return jmoment(MomentDate.format('YYYY/MM/DD HH:mm:ss')).locale('fa').format('YYYY/MM/DD - HH:mm:ss');
  }
}