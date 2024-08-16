import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, Routes } from '@angular/router';
import { LobbyComponent } from './app/lobby/lobby.component';
import { GameComponent } from './app/game/game.component';
import { WebSocketService } from './app/websocket.service';
import { provideAnimations } from '@angular/platform-browser/animations';

const routes: Routes = [
  { path: '', component: GameComponent },
  { path: 'lobby', component: LobbyComponent },
  { path: 'game', component: GameComponent },
  { path: 'join/:gameCode', component: LobbyComponent },
  { path: '**', redirectTo: '' },
];

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), WebSocketService, provideAnimations()],
}).catch((err) => console.error(err));
