import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import {
  AlertController,
  IonSlides,
  ModalController,
  Platform,
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-add-business-wizard',
  templateUrl: './add-business-wizard.component.html',
  styleUrls: ['./add-business-wizard.component.scss'],
})
export class AddBusinessWizardComponent implements OnInit, AfterViewInit {
  @ViewChild(IonSlides) ionSlides: IonSlides;
  slideOpts: any = {};
  businessName: string;
  businessNIF: string;
  businessAddress: any;
  businessPhoneNumber: number;
  maxTries: number;

  constructor(
    private modalController: ModalController,
    private authService: AuthService,
    private keyboard: Keyboard,
    private alertController: AlertController,
    private platform: Platform,
  ) {}

  ngOnInit() {
    this.maxTries = 3;
  }

  async ngAfterViewInit(): Promise<void> {
    await this.ionSlides.lockSwipes(true);
  }

  async saveBusinessName(name) {
    this.businessName = name;
    await this.nextSlide();
  }

  async saveBusinessNIF(nif) {
    this.businessNIF = nif;
    await this.nextSlide();
  }

  async saveBusinessAddress(address) {
    this.businessAddress = address;
    await this.nextSlide();
  }

  async saveBusinessPhone(phone) {
    this.businessPhoneNumber = phone;
    await this.authService.sendPhoneVerificationCode(phone);
    await this.nextSlide();
  }

  async checkVerificationCode(code) {
    try {
      await this.authService.verifyPhoneNumber(code);

      await this.modalController.dismiss({
        done: true,
        values: {
          name: this.businessName,
          nif: this.businessNIF,
          address: this.businessAddress,
          phone: this.businessPhoneNumber,
        },
      });
    } catch (e) {
      this.maxTries--;
      if (this.maxTries > 0) {
        await this.presentError(
          'El código de verificación es incorrecto. Por favor, introduzca de nuevo el teléfono o inténtelo de nuevo.',
          (this.maxTries === 1 ? 'Queda ' : 'Quedan ') +
            this.maxTries +
            (this.maxTries === 1 ? ' intento' : ' intentos'),
        );
        await this.ionSlides.slidePrev();
      } else {
        await this.presentError(
          'Ha agotado el número de intentos, se le va a redirigir al login',
          'Quedan ' + this.maxTries + ' intentos',
        );
        await this.cancel();
      }
    }
  }

  async nextSlide() {
    await this.ionSlides.lockSwipeToNext(false);
    await this.ionSlides.slideNext(600);
    await this.ionSlides.lockSwipes(false);
    await this.ionSlides.lockSwipeToNext(true);

    if (this.platform.is('cordova')) {
      await this.keyboard.hide(); // For cordova, to prevent going to the nextSlide with 'enter'
    }
  }

  async cancel() {
    this.maxTries = 3;
    await this.modalController.dismiss({ done: false });
  }

  async presentError(msg: string, subtitle: string) {
    const alert = await this.alertController.create({
      cssClass: 'alert',
      mode: 'ios',
      header: 'Error',
      subHeader: subtitle,
      message: msg,
      buttons: ['OK'],
    });

    await alert.present();
  }
}
