import { Component, OnInit, ViewEncapsulation, Input } from '@angular/core';
import * as io from 'socket.io-client';

// interfaces
import { Message } from '../models/message.interface';

// services
import { GlobalService } from '../../utils/global.service';
import { ChatService } from '../chat.service';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { UserDetails } from '../models/user-details.interface';
import { Subscription } from 'rxjs';

const SOCKET_ENDPOINT = 'localhost:3000/chat';
const USERS_SOCKET = 'localhost:3000/user-status';

@Component({
    selector: 'app-direct-message',
    templateUrl: './direct-message.component.html',
    styleUrls: ['./direct-message.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class DirectMessageComponent implements OnInit { 
    private socket: io;
    private userSocket: io;
    messageText: string = '';
    chatId: string = '';
    typing: boolean = false;
    timeout: any;
    typingUser: string = '';
    onlineUsers: string[] = [];

    subsParams: Subscription;
    subsParams1: Subscription;
    subsChatUUID: Subscription;
    subsUser: Subscription;
    subsEmail: Subscription;
    subsMessages: Subscription;

    receiver: UserDetails = {
        uuid: '',
        firstName: '',
        lastName: '',
        email: ''
    }

    @Input()
    receiverUUID: string;

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
        private router: Router,
        private globalService: GlobalService,
        private chatService: ChatService
    ) {}
    
    ngOnChanges() {
        if(this.receiverUUID !== '') {
            let container = document.getElementById('msg-container');

            // clear the messages' container
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }

            // close the sockets
            this.socket.close();
            this.userSocket.close();
            
            // these are always !== undefined
            this.subsUser.unsubscribe();
            this.subsParams.unsubscribe();
            this.subsMessages.unsubscribe();
            this.subsChatUUID.unsubscribe();

            if(this.subsEmail !== undefined) {
                this.subsEmail.unsubscribe();
            }
            
            if(this.subsParams1 !== undefined) {
                this.subsParams1.unsubscribe();
            }

            this.router.navigate(['chat/' + this.receiverUUID]).then(() => {
                this.setup();
            });
        } 
    }

    ngOnInit() {
        this.setup();
    }   

    setup(): void {
        this.subsParams = this.route.params.subscribe((data: Params) => {
            this.subsUser = this.chatService.getUserByUUID(data.conversation).subscribe((user: any) => {          
                this.receiver.firstName = user?.firstName;
                this.receiver.lastName = user?.lastName;
                this.receiver.email = user?.email;
            })

            this.subsChatUUID = this.chatService.getUUID(this.globalService.getCurrentUser()).subscribe((success: any) => {
                this.chatId = success.uuid > data.conversation ?
                                data.conversation + '_' + success.uuid : 
                                success.uuid + '_' + data.conversation;

                this.getMessages();   
                this.setupSocketConnection();
            });
        }) 
    }

    getMessages(): void {
        this.subsMessages = this.chatService.getMessages(this.chatId).subscribe((messages: Message[]) => {   
            const messageBody = document.getElementById('msg-container');

            messages.forEach(message => {
                if(message.sender === this.globalService.getCurrentUser()) {
                    this.addSenderMessage(message);
                } else {
                    this.addReceiverMessage(message);
                }
                
                messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;
            });
        });  
    }

    addSenderMessage(msg: Message): void {
        let wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'd-flex justify-content-end mb-4';

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

        const date = new Date();

        if(date.getTime() - msg.timestamp > 24 * 60 * 60 * 1000) {
            msgTime.innerHTML = new Date(msg.timestamp).toLocaleDateString('en-GB') + ' '  + 
                                        new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            msgTime.innerHTML = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        message.appendChild(msgTime);
        wrapperDiv.appendChild(message);

        let msgContainer = document.getElementById('msg-container');
        msgContainer.appendChild(wrapperDiv);
    }

    addReceiverMessage(message: Message): void {
        if(message.seen === false) {
            message.seen = true;
            this.socket.emit("seenMessage", this.chatId, message.messageId);
        }

        let wrapperDiv = document.createElement('div');
        wrapperDiv.className = "d-flex justify-content-start mb-4";

        let imageDiv = document.createElement('div');
        imageDiv.className = 'img_cont_msg';

        let img = document.createElement('img');
        img.className = 'rounded-circle user_img_msg'
        img.src = "https://static.turbosquid.com/Preview/001292/481/WV/_D.jpg";

        let messageDiv = document.createElement('div');
        messageDiv.className = 'msg_cotainer';
        messageDiv.innerHTML = message.message;
        messageDiv.id = message.messageId;
                
        let msgTimeSend = document.createElement('span');
        msgTimeSend.className = 'msg_time';
        msgTimeSend.style.width = '150px';

        const date = new Date();

        if(date.getTime() - message.timestamp > 24 * 60 * 60 * 1000) {
            msgTimeSend.innerHTML = new Date(message.timestamp).toLocaleDateString('en-GB') + ' ' +
                                            new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            msgTimeSend.innerHTML = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
                
        messageDiv.appendChild(msgTimeSend);
        imageDiv.appendChild(img);
        wrapperDiv.appendChild(imageDiv);
        wrapperDiv.appendChild(messageDiv);

        let msgContainer = document.getElementById('msg-container');
        msgContainer.appendChild(wrapperDiv);
    }

    stopTyping(): void {
        this.typing = false;
        this.socket.emit('noLongerTyping', this.chatId);
    }

    userIsTyping(): void {
        const time = 1000;

        if(this.typing === false) {
            this.typing = true;
            this.socket.emit('type', this.chatId, this.globalService.getCurrentUser(), this.receiver.email);

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
        this.socket = io(SOCKET_ENDPOINT);

        this.socket.on('connect', () => {
            this.socket.emit('setRoom', this.chatId);
        })

        this.socket.on('message-broadcast', (message: Message) => {
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

        this.socket.on('typing', (receiverEmail: string, firstName: string) => {
            if(receiverEmail === this.globalService.getCurrentUser()) {
                this.typingUser = firstName;
            }  
        });
        
        this.socket.on('stopTyping', () => {
            this.typingUser = '';
        })

        this.socket.on('seen', (messageId: string) => {
            const message = document.getElementById(messageId);
            message.style.backgroundColor = 'rgb(153, 214, 255)';
        })

        // users socket
        this.userSocket = io(USERS_SOCKET);

        this.userSocket.emit('getOnlineUsers');

        this.userSocket.on('users', (users: string[]) => {
            this.onlineUsers = users;
        })
    }

    sendMessage(): void { 
        if(!this.messageText.replace(/\s/g, '').length) {
            this.messageText = '';
            return;
        }

        this.message.seen = false;
        this.message.chatId = this.chatId;
        this.message.sender = this.globalService.getCurrentUser();
        
        this.subsParams1 = this.route.params.subscribe((data: Params) => {
            this.subsEmail = this.chatService.getEmailByUUID(data.conversation).subscribe((success: any) => {
                this.message.receiver = success.email;
                this.message.message = this.messageText;
        
                const date = new Date();
                this.message.timestamp = date.getTime();
            
                this.socket.emit('message', this.message);

                const messageBody = document.getElementById('msg-container');
                messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;

                this.messageText = '';
            });
        })
    }
}