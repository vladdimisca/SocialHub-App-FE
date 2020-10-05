import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class HomeService {
    constructor (
        private httpClient: HttpClient
    ) {}

    getUserByEmail(email: string): Observable<any> {
        return this.httpClient.get('http://localhost:3000/api/userByEmail?email=' + email);
    }

    getProfileImage(email: string): Observable<any> {
        return this.httpClient.get('http://localhost:3000/api/getProfilePicture?email=' + email);
    }

    getFriendsPostsByEmail(email: string): Observable<any> {
        return this.httpClient.get('http://localhost:3000/api/getFriendsPostsByEmail?email=' + email);
    }
}