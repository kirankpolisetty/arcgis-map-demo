import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import './app/resize-observer-polyfills';
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';


bootstrapApplication(AppComponent, {
  // Merge existing providers from appConfig with HttpClientModule
  providers: [
    ...(appConfig.providers ?? []), // keep any existing providers
    importProvidersFrom(HttpClientModule), // provide HttpClient
  ],
})
.catch((err) => console.error('Bootstrap error:', err));

