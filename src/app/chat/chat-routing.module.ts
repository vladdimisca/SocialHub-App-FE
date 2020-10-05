import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// components
import { ConversationComponent } from './conversation/conversation.component';

const routes: Routes = [
    {path: ':conversation', component: ConversationComponent, data: {title: 'Conversation'}}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChatRoutingModule { }
