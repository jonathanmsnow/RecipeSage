import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, ViewController, AlertController } from 'ionic-angular';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { MealPlanServiceProvider } from '../../../providers/meal-plan-service/meal-plan-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-meal-plan-popover',
  templateUrl: 'meal-plan-popover.html',
})
export class MealPlanPopoverPage {

  viewOptions: any;
  mealPlanId: any;
  mealPlan: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public utilService: UtilServiceProvider,
    public loadingService: LoadingServiceProvider,
    public mealPlanService: MealPlanServiceProvider,
    public toastCtrl: ToastController,
    public viewCtrl: ViewController,
    public alertCtrl: AlertController
  ) {
    this.viewOptions = navParams.get('viewOptions');
    this.mealPlanId = navParams.get('mealPlanId');
    this.mealPlan = navParams.get('mealPlan');
  }

  ionViewDidLoad() { }

  saveViewOptions() {
    localStorage.setItem('mealPlan.showAddedBy', this.viewOptions.showAddedBy);
    localStorage.setItem('mealPlan.showAddedOn', this.viewOptions.showAddedOn);
    localStorage.setItem('mealPlan.startOfWeek', this.viewOptions.startOfWeek);

    this.viewCtrl.dismiss();
  }

  deleteMealPlan() {
    let alert = this.alertCtrl.create({
      title: 'Confirm Delete',
      message: 'This will <b>permanently</b> remove this meal plan from your account.<br /><br /><b>Note</b>: If you\'re only a collaborator on this meal plan, it\'ll only be removed from your account. If you own this meal plan, it will be removed from all other collaborators accounts.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => { }
        },
        {
          text: 'Delete',
          cssClass: 'alertDanger',
          handler: () => {
            this._deleteMealPlan();
          }
        }
      ]
    });
    alert.present();
  }

  _deleteMealPlan() {
    var loading = this.loadingService.start();

    this.mealPlanService.unlink({
      id: this.mealPlanId
    }).subscribe(() => {
      loading.dismiss();

      this.viewCtrl.dismiss({
        setRoot: true,
        destination: 'MealPlansPage'
      });
    }, err => {
      loading.dismiss();
      switch (err.status) {
        case 0:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          }).present();
          break;
        case 401:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unauthorized,
            duration: 6000
          }).present();
          break;
        default:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          }).present();
          break;
      }
    });
  }
}
