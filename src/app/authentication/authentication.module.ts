// modules
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AuthenticationRoutingModule } from './auth-routing.module';
import { HttpClientModule } from '@angular/common/http';

// components
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { AboutComponent } from './about/about.component';

// services
import { AuthenticationService } from './authentication.service';

@NgModule({
  declarations: [
    LoginComponent,
    RegisterComponent,
    AboutComponent,
    NavbarComponent
  ],
  imports: [
    CommonModule,
    AuthenticationRoutingModule,
    HttpClientModule
  ],
  exports: [],
  providers: [AuthenticationService, HttpClientModule],
  bootstrap: []
})
export class AuthenticationModule { }
