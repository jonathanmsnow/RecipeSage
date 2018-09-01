import { Events, AlertController } from 'ionic-angular';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
// import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { Injectable } from '@angular/core';
import { catchError, retry } from 'rxjs/operators';

import { Label } from '../label-service/label-service';

import fractionjs from 'fraction.js';

export interface Recipe {
  _id: string;
  title: string;
  description: string;
  yield: string;
  activeTime: string;
  totalTime: string;
  source: string;
  url: string;
  notes: string;
  ingredients: string;
  instructions: string;
  labels: Label[];
  labels_flatlist: string;
  image: any;
  imageFile: any;
  imageURL: string;
  destinationUserEmail: string;
  fromUser: any;
  folder: string;
  score: number;
}

@Injectable()
export class RecipeServiceProvider {

  base: any;

  constructor(
    public http: HttpClient,
    public alertCtrl: AlertController,
    public events: Events) {
    this.base = localStorage.getItem('base') || '/api/';
  }

  getTokenQuery() {
    return '?token=' + localStorage.getItem('token');
  }

  getExportURL(format) {
    return this.base + 'recipes/export' + this.getTokenQuery() + '&format=' + format;
  }

  fetch(options) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    var url = this.base + 'recipes/' + this.getTokenQuery();
    if (options.folder) url += '&folder=' + options.folder;
    if (options.sortBy) url += '&sort=' + options.sortBy;
    if (options.labels && options.labels.length > 0) url += '&labels=' + options.labels.join(',');

    return this.http
    .get<Recipe[]>(url, httpOptions)
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  fetchById(recipeId) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return this.http
    .get<Recipe>(this.base + 'recipes/' + recipeId + this.getTokenQuery(), httpOptions)
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  create(data) {
    let formData: FormData = new FormData();
    if (data.imageFile) formData.append('image', data.imageFile, data.imageFile.name);

    delete data.imageFile;

    for (var i = 0; i < Object.keys(data).length; i++) {
      var key = Object.keys(data)[i];
      var val = data[key];

      formData.append(key, val);
    }

    const httpOptions = {};

    var me = this;
    return {
      subscribe: function(resolve, reject) {
        me.http
        .post(me.base + 'recipes/' + me.getTokenQuery(), formData, httpOptions)
        .pipe(
          catchError(me.handleError)
        ).subscribe(function(response) {
          me.events.publish('recipe:created');
          me.events.publish('recipe:generalUpdate');
          resolve(response);
        }, reject);
      }
    }
  }

  share(data) {
    if (!data.destinationUserEmail) throw 'DestinationUserEmail required for share operation';

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    if (data.image) data.imageURL = data.image.location;

    var me = this;
    return {
      subscribe: function(resolve, reject) {
        me.http
        .post(me.base + 'recipes/' + me.getTokenQuery(), data, httpOptions)
        .pipe(
          catchError(me.handleError)
        ).subscribe(function(response) {
          me.events.publish('recipe:generalUpdate');
          resolve(response);
        }, reject);
      }
    }
  }

  update(data) {
    let formData: FormData = new FormData();
    if (data.imageFile) formData.append('image', data.imageFile, data.imageFile.name);

    delete data.imageFile;

    for (var i = 0; i < Object.keys(data).length; i++) {
      var key = Object.keys(data)[i];
      var val = data[key];

      formData.append(key, val);
    }

    const httpOptions = {};

    var me = this;
    return {
      subscribe: function(resolve, reject) {
        me.http
        .put(me.base + 'recipes/' + data._id + me.getTokenQuery(), formData, httpOptions)
        .pipe(
          retry(1),
          catchError(me.handleError)
        ).subscribe(function(response) {
          me.events.publish('recipe:updated');
          me.events.publish('recipe:generalUpdate');
          resolve(response);
        }, reject);
      }
    }
  }

  remove(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    var me = this;
    return {
      subscribe: function(resolve, reject) {
        me.http
        .delete(me.base + 'recipes/' + data._id + me.getTokenQuery(), httpOptions)
        .pipe(
          retry(1),
          catchError(me.handleError)
        ).subscribe(function(response) {
          me.events.publish('recipe:deleted');
          me.events.publish('recipe:generalUpdate');
          resolve(response);
        }, reject);
      }
    }
  }

  print(recipe, template) {
    window.open(this.base + 'print/' + this.getTokenQuery() + '&recipeId=' + recipe._id + '&template=' + template.name + '&modifiers=' + template.modifiers + '&print=true');
  }

  scrapePepperplate(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return this.http
    .get(this.base
      + 'scrape/pepperplate'
      + this.getTokenQuery()
      + '&username=' + encodeURIComponent(data.username)
      + '&password=' + encodeURIComponent(data.password)
    , httpOptions)
    .pipe(
      catchError(this.handleError)
    );
  }

  scaleIngredients(ingredients, scale, boldify?) {
    if (!ingredients) return [];

    var lines = ingredients.match(/[^\r\n]+/g);

    // var measurementRegexp = /\d+(.\d+(.\d+)?)?/;
    var measurementRegexp = /((\d+ )?\d+([\/\.]\d+)?((-)|( to )|( - ))(\d+ )?\d+([\/\.]\d+)?)|((\d+ )?\d+[\/\.]\d+)|\d+/;

    for (var i = 0; i < lines.length; i++) {
      var matches = lines[i].match(measurementRegexp);
      if (!matches || matches.length === 0) continue;

      var measurement = matches[0];

      try {
        var measurementParts = measurement.split(/-|to/);

        for (var j = 0; j < measurementParts.length; j++) {
          // console.log(measurementParts[j].trim())
          var scaledMeasurement = fractionjs(measurementParts[j].trim()).mul(scale);

          // Preserve original fraction format if entered
          if (measurementParts[j].indexOf('/') > -1) {
            scaledMeasurement = scaledMeasurement.toFraction(true);
          }

          if (boldify) measurementParts[j] = '<b>' + scaledMeasurement + '</b>';
          else measurementParts[j] = scaledMeasurement;
        }

        lines[i] = lines[i].replace(measurementRegexp, measurementParts.join(' to '));
      } catch (e) {
        console.log("failed to parse", e)
      }
    }

    return lines;
  }

  scaleIngredientsPrompt(currentScale, cb) {
    let alert = this.alertCtrl.create({
      title: 'Recipe Scale',
      message: 'Enter a number or fraction to scale the recipe',
      inputs: [
        {
          name: 'scale',
          value: currentScale.toString(),
          placeholder: 'Scale'
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          handler: () => { }
        },
        {
          text: 'Apply',
          handler: (data) => {
            // Support fractions
            let parsed = fractionjs(data.scale).valueOf();
            // Trim long/repeating decimals
            let rounded = Number(parsed.toFixed(3));
            // Check for falsy values
            if (!rounded || rounded <= 0) rounded = 1;
            // Check for invalid values
            // rounded = parseFloat(rounded) || 1;
            cb(rounded);
          }
        }
      ]
    });

    alert.present();
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    // return an ErrorObservable with a user-facing error message
    return new ErrorObservable({
      msg: 'Something bad happened; please try again later.',
      status: error.status
    });
  }
}
