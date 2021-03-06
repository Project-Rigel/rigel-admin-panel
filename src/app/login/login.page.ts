import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { LoaderService } from '../services/loader.service';
import { AddBusinessWizardComponent } from './add-business-wizard/add-business-wizard.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  userForm;
  userId: string;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    public authService: AuthService,
    public modalController: ModalController,
    private loader: LoaderService,
    private alertService: AlertController,
  ) {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.userId = user.id;
      }
    });
  }

  ngOnInit() {
    this.userForm = this.formBuilder.group({
      email: '',
      password: '',
      fullName: '',
    });
  }

  async registerUser() {
    const userContext = await this.authService.createUserIfNewOrUpdate(
      this.userForm.value.email,
      this.userForm.value.password,
    );
    await this.redirectAfterLogin(userContext.isNewUser);
  }

  private async redirectAfterLogin(isNewUser: boolean) {
    if (isNewUser) {
      await this.startAddBusinessWizard();
    } else {
      await this.router.navigate(['app', 'tabs']);
    }
  }

  async logOut() {
    await this.authService.logOut();
  }

  async loginWithGoogle() {
    const isNewUser = await this.authService.loginWithGoogle();
    await this.redirectAfterLogin(isNewUser);
  }

  async startAddBusinessWizard() {
    const modal = await this.modalController.create({
      component: AddBusinessWizardComponent,
      swipeToClose: false,
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (!data.done) {
      await this.logOut();
      this.authService.deleteCurrentUser();
    } else {
      await this.authService.saveBusiness(data.values);
      await this.authService.logOut();

      const alert = await this.alertService.create({
        backdropDismiss: false,
        header: '¡Felicades!',
        message:
          'Se ha asociado el negocio a su cuenta. Se va a cerrar la sesión para aplicar los cambios.',
        buttons: [
          {
            text: 'Ok',
            handler: async blah => {
              await this.router.navigate(['login']);
            },
          },
        ],
      });

      await alert.present();
    }
  }
}
