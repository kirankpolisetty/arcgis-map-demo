import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, of } from 'rxjs';
import { Rig } from '../water-well';


@Injectable({
  providedIn: 'root',
})
export class MorningreportService {
  errorMessage = '';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  getMorningReport(): Observable<Rig[]> {
    console.log("I am her in th service..");
    if (!isPlatformBrowser(this.platformId)) {
      return of([]); // return empty observable if not in browser
    }

    return this.http.get<Rig[]>('assets/rigs.json').pipe(
      catchError((err) => {
        console.error('***Error loading rigs:***', err);
        this.errorMessage =
          'Failed to load rig data. Please check the file path';
        return of([] as Rig[]);
      })
    );
  }
}
