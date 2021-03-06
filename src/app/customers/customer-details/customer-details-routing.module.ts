import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomerDetailsPage } from './customer-details.page';

const routes: Routes = [
  {
    path: '',
    component: CustomerDetailsPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomerDetailsPageRoutingModule {}
