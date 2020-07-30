import { Component, OnInit, ViewChild } from '@angular/core';
import {
  AlertController,
  AnimationController,
  IonDatetime,
  ModalController,
} from '@ionic/angular';
import { DatePickerComponent } from '../../components/date-picker/date-picker.component';
import { Animation } from '@ionic/core';
import { AppointmentsService } from '../../services/appointments.service';
import { Appointment } from '../../interfaces/appointment';
import { AgendaService } from '../../services/agenda.service';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { Agenda } from '../../interfaces/agenda';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { AddAppointmentWizardComponent } from '../add-appointment-wizard/add-appointment-wizard.component';
import * as moment from 'moment';
import { duration, Duration, Moment } from 'moment';
import { Customer } from '../../interfaces/customer';
import { Product } from '../../interfaces/product';

interface DisplayItem {
  appointment?: Appointment;
  interval: Date;
  appointmentHeight?: number;
  pxFromLast?: number;
}

@Component({
  selector: 'app-agenda-details',
  templateUrl: './agenda-details.page.html',
  styleUrls: ['./agenda-details.page.scss'],
})
export class AgendaDetailsPage implements OnInit {
  closeCalendar: Animation;
  openCalendar: Animation;
  closeConfirmApoointment: Animation;
  openConfirmAppoinment: Animation;
  isCalendarOpen: boolean = true;
  isConfirmAppointmentOpen: boolean = false;
  display: DisplayItem[] = [];
  @ViewChild(DatePickerComponent)
  datePicker: DatePickerComponent;
  calendarButtonColor = 'primary';
  agenda$: Observable<Agenda>;
  addingAppointment = false;
  addingAppointmentInfo: {
    intervals: { from: string; to: string }[];
    customer: Customer;
    product: Product;
  };
  appoinmentGaps: string[] = [];
  startDate: Moment;
  endDate: Moment;
  interval: Duration;
  dateTimeInitialValue: Moment;
  dateTimeValue = new Date();
  selectedStartTime: boolean = false;
  possibleAppointmentId: string;
  appointment;
  exisitingAppointment = null;
  dayAppointments: Appointment[] = [];

  @ViewChild(IonDatetime) dateTime: IonDatetime;
  public loading: boolean;

  constructor(
    private animationController: AnimationController,
    public appointmentsService: AppointmentsService,
    private agendaService: AgendaService,
    public route: ActivatedRoute,
    private modalController: ModalController,
    public alertController: AlertController,
  ) {
    this.startDate = moment(new Date().setHours(7, 0, 0, 0));
    this.endDate = moment(new Date().setHours(23, 0, 0, 0));
    this.interval = duration(30, 'minutes');
    this.dateTimeInitialValue = moment(
      new Date().setHours(this.startDate.get('hours')),
    );
    const value = this.route.snapshot.paramMap.get('id');
    this.agenda$ = this.agendaService.getAgendaById(value);

    this.appointmentsService.appointments$.subscribe(data => {
      this.dayAppointments = data;
    });
  }

  ngOnInit() {
    this.updateAppointments(new Date());
  }

  ionViewDidEnter() {
    this.closeCalendar = this.animationController
      .create()
      .addElement(document.getElementById('date-container'))
      .duration(400)
      .fromTo('height', '246px', '0px')
      .easing('ease-in-out');

    this.openCalendar = this.animationController
      .create()
      .addElement(document.getElementById('date-container'))
      .duration(400)
      .fromTo('height', '0px', '246px')
      .easing('ease-in-out');

    this.closeConfirmApoointment = this.animationController
      .create()
      .addElement(document.getElementById('confirm-container'))
      .duration(400)
      .fromTo('height', '200px', '0px')
      .easing('ease-in-out');

    this.openConfirmAppoinment = this.animationController
      .create()
      .addElement(document.getElementById('confirm-container'))
      .duration(400)
      .fromTo('height', '0px', '200px')
      .easing('ease-in-out');
  }

  onDateChange(event) {
    this.startDate = moment(event.setHours(7, 0, 0, 0));
    this.endDate = moment(event.setHours(23, 0, 0, 0));
    this.dateTimeValue = event;
    this.updateAppointments(event);
  }

  async showCalendar() {
    this.calendarButtonColor = this.isCalendarOpen ? 'medium' : 'primary';
    this.openCalendar.stop();
    this.closeCalendar.stop();
    this.isCalendarOpen
      ? await this.closeCalendar.play()
      : await this.openCalendar.play();
    this.isCalendarOpen = !this.isCalendarOpen;
  }

  async showConfirmApoointmentDialog() {
    this.openConfirmAppoinment.stop();
    this.closeConfirmApoointment.stop();
    this.isConfirmAppointmentOpen
      ? await this.closeConfirmApoointment.play()
      : await this.openConfirmAppoinment.play();
    this.isConfirmAppointmentOpen = !this.isConfirmAppointmentOpen;
  }

  async startAddAppointmentWizard() {
    const modal = await this.modalController.create({
      component: AddAppointmentWizardComponent,
      swipeToClose: true,
      componentProps: {
        //display: this.display,
        agendaId: this.route.snapshot.paramMap.get('id'),
        daySelected: this.dateTimeValue,
      },
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (data) {
      if (data.done) {
        this.addingAppointment = true;
        this.addingAppointmentInfo = data;

        this.showConfirmApoointmentDialog();
        // Calculamos las horas disponibles teniendo en cuenta los intervalos y la duración de los productos
        const intervals = this.addingAppointmentInfo.intervals;
        const productDuration = this.addingAppointmentInfo.product.duration;
        for (const gap of intervals) { // 8-12 / 16-20
          for (
            let item = moment(gap.from, 'HH:mm');
            moment(gap.to, 'HH:mm').diff(item) > 0;
            item.add(this.interval.asMinutes(), 'minutes')
          ) {  // 8:30   9:00  9:30  10:00 .....
            const aux = moment(item);
            if (
              moment(gap.to, 'HH:mm').diff(
                aux.add(productDuration.asMinutes(), 'minutes'),
              ) >= 0
            ) {

              // if el intervalo tiene hueco (depende de las citas ya creadas)
              let hasGap = true;
              this.dayAppointments.forEach(element => {
                // Posible error con los minutos a y media
                if (this.isStartTimeFull(element, item) || this.isDurationBiggerThanGap(item, element, productDuration)) {
                  hasGap = false;
                }
                //console.log("Cita: " + element.startDate.getHours() + ":" + element.startDate.getMinutes())
                //console.log("Chip actual: " + item.hour() + ":" + item.minute())
              });

              if (hasGap) {
                this.appoinmentGaps.push(item.format('HH:mm'));
              }
            }
          }
        }
      }
    }
  }

  isStartTimeFull(element, item) {
    return element.startDate.getHours() === item.hour() && element.startDate.getMinutes() === item.minute() && element.sharesStartTimeWithOtherAppointment;
  }

  isDurationBiggerThanGap(item: Moment, appointment: Appointment, productDuration: Duration) {
    let end = moment(item).add(productDuration.asMinutes(), 'minutes').toDate();
    end.setMonth(this.dateTimeValue.getMonth());
    end.setFullYear(this.dateTimeValue.getFullYear());
    end.setDate(this.dateTimeValue.getDate())
  
    if (this.isBetweenAppointment(appointment, end) && appointment.sharesStartTimeWithOtherAppointment && appointment.positionSharing === 2) {
      return true
    }
    return false;
  }

  isBetweenAppointment(appointment: Appointment, date: Date) : boolean {
    return appointment.startDate.getTime() < date.getTime() && appointment.endDate.getTime() >= date.getTime();
  }

  selectTime($event) {
    this.updatePossibleAppointment($event);
    this.selectedStartTime = !this.selectedStartTime;
    this.showConfirmApoointmentDialog();
  }

  async updatePossibleAppointment($event: any) {
    let hour = parseInt($event.target.innerText.split(':')[0]);
    let minutes = parseInt($event.target.innerText.split(':')[1]);
    if (isNaN(hour)) {
      hour = parseInt($event.target.parentNode.innerText.split(':')[0]);
      minutes = parseInt($event.target.parentNode.innerText.split(':')[1]);
    }

    this.dateTimeValue.setHours(hour);
    this.dateTimeValue.setMinutes(minutes);

    if (!this.possibleAppointmentId) {
      this.possibleAppointmentId = this.appointmentsService.getId();
    }

    /////////////////
    let sharesStartDate: boolean;
    let sharingPosition: number;
    let numberOfAppointmentsAtStartDate = 0;
    let index = 0;
    console.log(this.dateTimeValue);
    
    this.dayAppointments.forEach((element, i) => {
      if (element.startDate.getTime() === this.dateTimeValue.getTime()) {
        numberOfAppointmentsAtStartDate++;
        index = i;
      }
    });
    console.log(index);
    
    if (numberOfAppointmentsAtStartDate === 0) {
      // Si array de citas contiene x elementos, entonces ...
      sharesStartDate = false;
      sharingPosition = 0; // enum
      console.log('Cita sola');
    } else if (numberOfAppointmentsAtStartDate === 1) {
      this.dayAppointments[index].sharesStartTimeWithOtherAppointment = true; // Wrong? sharing = 1
      this.dayAppointments[index].positionSharing = 1;
      this.appointmentsService.updateExistingAppointment(
        this.dayAppointments[index],
      );
      this.exisitingAppointment = this.dayAppointments[index]

      sharesStartDate = true;
      sharingPosition = 2;
      console.log('Cita doble');
    } else {
      console.log('Error, más de 2 citas');

      // return error o alerta
    }

    ////////////////

    this.appointment = {
      id: this.possibleAppointmentId,
      startDate: this.dateTimeValue,
      endDate: moment(this.dateTimeValue)
        .add(this.addingAppointmentInfo.product.duration)
        .toDate(),
      name: this.addingAppointmentInfo.product.name,
      customerId: this.addingAppointmentInfo.customer.id,
      customerName: this.addingAppointmentInfo.customer.name,
      sharesStartTimeWithOtherAppointment: sharesStartDate,
      positionSharing: sharingPosition,
      // cita: null : []
    };
    this.appointmentsService.updatePossibleAppointment(this.appointment);
  }

  async confirmAppointments(agendaId: string) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Cita confirmada',
      message: 'Fecha: ' + this.dateTimeValue,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: blah => {
            console.log('Confirm Cancel: blah');
          },
        },
        {
          text: 'Ok',
          handler: async () => {
            try {
              this.loading = true;
              await this.appointmentsService.confirmAppointments(agendaId);
              this.loading = false;
              this.addingAppointmentInfo = null;
              this.addingAppointment = false;
            } catch (e) {
              this.loading = false;
            }
          },
        },
      ],
    });
    await alert.present();
  }

  private updateAppointments(date: Date) {
    this.agenda$
      .pipe(
        switchMap(agenda => {
          return this.appointmentsService.updateDayAppointments(
            agenda.id,
            date,
          );
        }),
        take(1),
      )
      .subscribe(v => v);
  }

  cancelAddAppointment() {
    this.addingAppointment = false;
    this.addingAppointmentInfo = null;
    this.appoinmentGaps = [];
    if (this.appointment != null) {
      this.appointmentsService.cancelAppointment(this.appointment);
      this.appointment = null;
    }    
    if (this.exisitingAppointment != null) {
      this.appointmentsService.restoreExistingAppointment(this.exisitingAppointment);
      this.exisitingAppointment = null;
    }
  }
}
