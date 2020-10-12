import { Component, OnInit, ViewEncapsulation, Output, EventEmitter } from '@angular/core';
import * as io from 'socket.io-client';

// interfaces
import { Message } from '../../models/message.interface';
import { User } from '../../models/user.interface';

// services
import { GlobalService } from '../../utils/global.service';
import { ChatService } from '../chat.service';
import { ActivatedRoute, Params } from '@angular/router';

const CHAT_SOCKET_ENDPOINT = 'localhost:3000/chat';
const USERS_SOCKET_ENDPOINT = 'localhost:3000/user-status';

@Component({
    selector: 'app-direct-message',
    templateUrl: './direct-message.component.html',
    styleUrls: ['./direct-message.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class DirectMessageComponent implements OnInit { 
    private chatSocket: io;
    private userSocket: io;
    conversation: string;
    messageText: string = '';
    chatId: string = '';
    typing: boolean = false;
    timeout: any;
    typingUser: string = '';
    onlineUsers: string[] = [];

    @Output()
    messagesChange: EventEmitter<any> = new EventEmitter();

    receiver: User = {
        uuid: '',
        firstName: '',
        lastName: '',
        fullName: undefined,
        email: '',
        description: undefined,
        pictureURL: ''
    }

    private message: Message = {
        messageId: undefined,
        chatId: undefined,
        sender: undefined,
        receiver: undefined,
        message: undefined,
        timestamp: undefined,
        seen: false
    };
    
    constructor(
        private route: ActivatedRoute,
        private globalService: GlobalService,
        private chatService: ChatService
    ) {}

    ngOnInit() {
        this.setup(); 
    }   

    setup(): void {
        this.route.params.subscribe((data: Params) => {
            if(this.chatSocket !== undefined) {
                this.chatSocket.close();
            }

            if(this.userSocket !== undefined) {
                this.userSocket.close();
            }

            this.conversation = data.conversation;
            
            if(this.conversation !== 'inbox') {
                let container = document.getElementById('msg-container');

                // clear the messages' container
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }

                this.chatService.getUserByUUID(data.conversation).subscribe((user: User) => {          
                    this.receiver = user;

                    this.chatService.getProfilePicture(this.receiver.email).subscribe((pictureURL: string) => {
                        if(pictureURL === null) {
                            this.receiver.pictureURL = "assets/images/blank.jpg";
                        } else {
                            this.receiver.pictureURL = pictureURL;
                        }

                        this.chatService.getUUIDbyEmail(this.globalService.getCurrentUser()).subscribe((success: any) => {
                            this.chatId = success.uuid > data.conversation ?
                                            data.conversation + '_' + success.uuid : 
                                            success.uuid + '_' + data.conversation;
        
                            this.getMessages();   
                            this.setupSocketConnection();
                        });
                    });
                });
            }
        });
    }

    getMessages(): void {
        this.chatService.getMessages(this.chatId).subscribe((messages: Message[]) => {   
            const messageBody = document.getElementById('msg-container');
            const email = this.globalService.getCurrentUser();

            messages.forEach(message => {
                if(message.sender === email) {
                    this.addSenderMessage(message);
                } else {
                    this.addReceiverMessage(message);
                }
                
                messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;
            });
        });  
    }

    addSenderMessage(msg: Message): void {
        this.messagesChange.emit(msg.timestamp);

        let wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'd-flex justify-content-end mb-1';

        let message = document.createElement('div');
        message.className = 'msg_cotainer_send';
        message.innerHTML = msg.message;
        message.id = msg.messageId;

        if(msg.seen === true) {
            message.style.backgroundColor = 'rgb(153, 214, 255)';
        }

        let msgTime = document.createElement('span');
        msgTime.className = 'msg_time_send text-right';
        msgTime.style.width = '150px';
        msgTime.innerHTML = this.getDateAgo(msg.timestamp);
        msgTime.style.display = 'none';

        message.onclick = (event: any) => {
            if(event.target.tagName.toLowerCase() === 'span') {
               return; 
            }

            if(msgTime.style.display === 'none') {
                msgTime.style.display = 'block';
                wrapperDiv.classList.remove("mb-1");
                wrapperDiv.className += " mb-4";
            } else {
                msgTime.style.display = 'none';
                wrapperDiv.classList.remove("mb-4");
                wrapperDiv.className += " mb-1";
            } 
        }
        
        setInterval(() => {
            msgTime.innerHTML = this.getDateAgo(msg.timestamp);
        }, 5000);

        message.appendChild(msgTime);
        wrapperDiv.appendChild(message);

        let msgContainer = document.getElementById('msg-container');
        msgContainer.appendChild(wrapperDiv);
    }

    addReceiverMessage(message: Message): void {
        if(message.seen === false) {
            message.seen = true;
            this.chatSocket.emit("seenMessage", this.chatId, message.messageId, message.sender, message.receiver, message.timestamp);
        }

        this.messagesChange.emit(message.timestamp);

        let wrapperDiv = document.createElement('div');
        wrapperDiv.className = "d-flex justify-content-start mb-1";

        let imageDiv = document.createElement('div');
        imageDiv.className = 'img_cont_msg';

        let img = document.createElement('img');
        img.className = 'rounded-circle user_img_msg';
        img.src = this.receiver?.pictureURL;

        let messageDiv = document.createElement('div');
        messageDiv.className = 'msg_cotainer';
        messageDiv.innerHTML = message.message;
        messageDiv.id = message.messageId;
                
        let msgTimeSent = document.createElement('span');
        msgTimeSent.className = 'msg_time';
        msgTimeSent.style.width = '150px';
        msgTimeSent.innerHTML = this.getDateAgo(message.timestamp);
        msgTimeSent.style.display = 'none';

        messageDiv.onclick = (event: any) => {
            if(event.target.tagName.toLowerCase() === 'span') {
               return; 
            }

            if(msgTimeSent.style.display === 'none') {
                msgTimeSent.style.display = 'block';
                wrapperDiv.classList.remove("mb-1");
                wrapperDiv.className += " mb-4";
            } else {
                msgTimeSent.style.display = 'none';
                wrapperDiv.classList.remove("mb-4");
                wrapperDiv.className += " mb-1";
            } 
        }
        
        setInterval(() => {
            msgTimeSent.innerHTML = this.getDateAgo(message.timestamp);
        }, 5000);
                
        messageDiv.appendChild(msgTimeSent);
        imageDiv.appendChild(img);
        wrapperDiv.appendChild(imageDiv);
        wrapperDiv.appendChild(messageDiv);

        let msgContainer = document.getElementById('msg-container');
        msgContainer.appendChild(wrapperDiv);
    }

    stopTyping(): void {
        this.typing = false;
        this.chatSocket.emit('noLongerTyping', this.chatId);
    }

    userIsTyping(): void {
        const time = 1000;

        if(this.typing === false) {
            this.typing = true;
            this.chatSocket.emit('type', this.chatId, this.globalService.getCurrentUser(), this.receiver.email);

            this.timeout = setTimeout(() => {
                this.stopTyping();
            }, time);
        } else {
            clearTimeout(this.timeout);

            this.timeout = setTimeout(() => {
                this.stopTyping();
            }, time);
        }
    }

    setupSocketConnection(): void {
        // chat socket
        this.chatSocket = io(CHAT_SOCKET_ENDPOINT);

        this.chatSocket.on('connect', () => {
            this.chatSocket.emit('setRoom', this.chatId);
        })

        this.chatSocket.on('message-broadcast', (message: Message) => {
            this.messagesChange.emit(message.timestamp);

            const messageBody = document.getElementById('msg-container');
            let notScrolled = false;

            if (message !== undefined) {
                if(message.sender === this.globalService.getCurrentUser()) {
                    this.addSenderMessage(message);
                } else {
                    if(messageBody.scrollTop + 200 < messageBody.scrollHeight - messageBody.clientHeight) {
                        notScrolled = true;
                    }

                    this.addReceiverMessage(message);
                }
                
                if(notScrolled === false) {
                    messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;
                }
            }
        });

        this.chatSocket.on('typing', (receiverEmail: string, firstName: string) => {
            if(receiverEmail === this.globalService.getCurrentUser()) {
                this.typingUser = firstName;
            }  
        });
        
        this.chatSocket.on('stopTyping', () => {
            this.typingUser = '';
        });

        this.chatSocket.on('seen', (messageId: string) => {
            const message = document.getElementById(messageId);
            message.style.backgroundColor = 'rgb(153, 214, 255)';
        });

        // users socket
        this.userSocket = io(USERS_SOCKET_ENDPOINT);

        this.userSocket.emit('getOnlineUsers');

        this.userSocket.on('onlineUsers', (users: string[]) => {
            this.onlineUsers = users;
        });

        this.userSocket.on('onlineUser', (newUser: string) => {
            if(this.onlineUsers.includes(newUser)) {
                this.onlineUsers.push(newUser);
            }
        });

        this.userSocket.on('offlineUser', (userToRemove: string) => {
            this.onlineUsers = this.onlineUsers.filter(user => user !== userToRemove);
        });
    }

    sendMessage(event: any): void { 
        if(!this.messageText.replace(/\s/g, '').length) {
            this.messageText = '';
            return;
        }

        if(event instanceof KeyboardEvent) {
            this.messageText = this.messageText.slice(0, -1);
        }

        this.message.seen = false;
        this.message.chatId = this.chatId;
        this.message.sender = this.globalService.getCurrentUser();
        this.message.receiver = this.receiver.email;
        this.message.message = this.messageText;
        
        const date = new Date();
        this.message.timestamp = date.getTime();
                
        this.chatSocket.emit('message', this.message);

        const messageBody = document.getElementById('msg-container');
        messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;

        this.messageText = '';
    }

    getDateAgo(timestamp: number): string {
        let result: string;
        let now = new Date().getTime(); // current time
        let delta = (now - timestamp) / 1000; // time since message was sent in seconds

        if (delta < 45) {
            result = 'Just now';
        } else 
            if (delta < 60) { // sent in last minute
            result = Math.floor(delta) + ' seconds ago';
            } else 
                if (delta < 3600) { // sent in last hour
                    if(Math.floor(delta / 60) === 1) {
                        result = Math.floor(delta / 60) + ' minute ago';
                    } else {
                        result = Math.floor(delta / 60) + ' minutes ago';
                    }
                } else
                    if (delta < 86400) { // sent on last day
                        if(Math.floor(delta / 3600) === 1) {
                            result = Math.floor(delta / 3600) + ' hour ago';
                        } else {
                            result = Math.floor(delta / 3600) + ' hours ago';
                        }
                    } else 
                        if (delta < 3 * 86400) { // sent on last 3 days
                            if(Math.floor(delta / 86400) === 1) {
                                result = Math.floor(delta / 86400) + ' day ago';
                            } else {
                                result = Math.floor(delta / 86400) + ' days ago';
                            }
                        } else { // sent more than three days ago
                            result = new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) + ' at ' +
                                        new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }
        return result;
    }
}