import { Component } from '@angular/core';
import { FooterComponent } from '@coreui/angular';
import { JalaliPipe } from '../../../providers/jalali-pipe'
import { JalaliDayPipe } from '../../../providers/jalali-day-pipe'
@Component({
  selector: 'app-default-footer',
  templateUrl: './default-footer.component.html',
  styleUrls: ['./default-footer.component.scss'],
  imports: [
    JalaliPipe,
    JalaliDayPipe
  ]
})
export class DefaultFooterComponent extends FooterComponent {
  constructor() {
    super();
  }
  public today = new Date();
}
