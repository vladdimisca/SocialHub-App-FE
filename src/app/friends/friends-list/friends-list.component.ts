import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as io from 'socket.io-client';

// services
import { GlobalService } from '../../utils/global.service';
import { FriendsService } from '../friends.service';

// interfaces
import { User } from '../../models/User.interface';

const FRIENDS_SOCKET_ENDPOINT = 'localhost:3000/friends';

@Component({
    selector: 'friends-list',
    templateUrl: './friends-list.component.html',
    styleUrls: ['./friends-list.component.scss']
})
export class FriendsListComponent implements OnInit {
    friendsSocket: io = undefined;
    friends: User[] = [];
    currentUser: string;

    constructor(
        private router: Router,
        private globalService: GlobalService,
        private friendsService: FriendsService,
    ) {}

    ngOnInit() {
        this.currentUser = this.globalService.getCurrentUser();
        
        this.setupSocketConnection();

        this.friendsService.getFriendsByEmail(this.currentUser).subscribe((friends: User[]) => {
            this.friends = friends;

            this.connect();

            this.friends.forEach(friend => {
                this.friendsService.getDescription(friend.email).subscribe((description: string) => {
                    friend.description = description;
                });

                this.friendsService.getProfileImage(friend.email).subscribe((pictureURL: string) => {
                    if(pictureURL === null) {
                        friend.pictureURL = "assets/images/blank.jpg";
                    } else {
                        friend.pictureURL = pictureURL;
                    }
                });
            });
        });
    }

    connect(): void {
        this.friends.forEach(friend => {
            this.friendsSocket.emit('join', friend.email);
        });
    }

    setupSocketConnection(): void {
        this.friendsSocket = io(FRIENDS_SOCKET_ENDPOINT);

        this.friendsSocket.on('connect', () => {
            this.friendsSocket.emit('join', this.currentUser);
        });

        this.friendsSocket.on('unfriendSent', (sender: string, receiver: string) => {
            if(sender === this.currentUser && this.friends.map(user => user.email).includes(receiver)) {
                this.friends = this.friends.filter(user => user.email !== receiver);
            }
        });

        this.friendsSocket.on('unfriendReceived', (sender: string, receiver: string) => {
            if(this.friends.map(user => user.email).includes(sender) && receiver === this.currentUser) {
                this.friends = this.friends.filter(user => user.email !== sender);
            } 
        });

        this.friendsSocket.on('requestAccepted', (sender: string, receiver: string) => {
            if(this.friends.map(user => user.email).includes(sender) && receiver === this.currentUser) {
                this.pushFriend(sender);
            } else 
                if(sender === this.currentUser && this.friends.map(user => user.email).includes(receiver)) {
                    this.pushFriend(receiver);
                }
        });
    }

    pushFriend(newFriend: string): void {
        this.friendsService.getUserByEmail(newFriend).subscribe((user: User) => {
            const friend: User = user;
            friend.description = '';

            this.friendsService.getProfileImage(user.email).subscribe((pictureURL: string) => {
                if(pictureURL === null) {
                    friend.pictureURL = "assets/images/blank.jpg";
                } else {
                    friend.pictureURL = pictureURL;
                }

                this.friendsService.getDescription(user.email).subscribe((description: string) => {
                    friend.description = description;

                    this.friends.push(friend);
                });
            });
        });
    }

    removeFriend(email: string): void {
        this.friendsSocket.emit('unfriendRequest', this.currentUser, email);
    }

    openConversation(uuid: string): void {
        this.router.navigateByUrl('chat/' + uuid);
    }

    openFriendRequests(): void {
        this.router.navigateByUrl('friends/friend-requests');
    }
}