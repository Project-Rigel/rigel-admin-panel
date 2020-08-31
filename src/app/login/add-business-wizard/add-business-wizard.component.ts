import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { IonSlides, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-add-business-wizard',
  templateUrl: './add-business-wizard.component.html',
  styleUrls: ['./add-business-wizard.component.scss'],
})
export class AddBusinessWizardComponent implements AfterViewInit {
  @ViewChild(IonSlides) ionSlides: IonSlides;
  slideOpts: any = {};
  businessName: string;

  constructor(private modalController: ModalController) {}

  //ngOnInit() {}

  async ngAfterViewInit(): Promise<void> {
    await this.ionSlides.lockSwipes(true);
  }

  async saveBusinessName(name) {
    this.businessName = name;
    await this.nextSlide();
  }

  async nextSlide() {
    await this.ionSlides.lockSwipeToNext(false);
    await this.ionSlides.slideNext(600);
    await this.ionSlides.lockSwipes(false);
    await this.ionSlides.lockSwipeToNext(true);
  }

  async cancel() {
    await this.modalController.dismiss({ done: false });
  }
}