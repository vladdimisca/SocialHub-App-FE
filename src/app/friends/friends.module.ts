import { NgModule } from '@angular/core';

// modules
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FriendsRoutingModule } from './friends-routing.module';
import { NavbarModule } from '../navbar/navbar.module';

// components
import { FriendRequestsComponent } from './friend-requests/friend-requests.component';

// services
import { GlobalService } from '../utils/global.service';

@NgModule({
    declarations: [
        FriendRequestsComponent
    ],
    imports: [
        CommonModule,
        HttpClientModule,
        FriendsRoutingModule,
        NavbarModule
    ],
    providers: [GlobalService],
    bootstrap: []
})
export class FriendsModule {}