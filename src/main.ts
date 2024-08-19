import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, Routes } from '@angular/router';
import { LobbyComponent } from './app/lobby/lobby.component';
import { GameComponent } from './app/game/game.component';
import { WebSocketService } from './app/websocket.service';
import { provideAnimations } from '@angular/platform-browser/animations';
import { VersusComponent } from './app/versus/versus.component';
import { MainMenuComponent } from './app/main-menu/main-menu.component';

const routes: Routes = [
  { path: '', component: MainMenuComponent },
  { path: 'lobby', component: LobbyComponent },
  { path: 'versus', component: VersusComponent },
  { path: 'game', component: GameComponent },
  { path: 'join/:gameCode', component: LobbyComponent },
  { path: 'solo', component: GameComponent },
  { path: '**', redirectTo: '' },
];

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), WebSocketService, provideAnimations()],
}).catch((err) => console.error(err));
