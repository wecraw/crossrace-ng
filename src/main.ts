import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, Routes } from '@angular/router';
import { LobbyComponent } from './app/lobby/lobby.component';
import { GameComponent } from './app/game/game.component';
import { WebSocketService } from './app/websocket.service';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MainMenuComponent } from './app/main-menu/main-menu.component';

const routes: Routes = [
  { path: '', component: MainMenuComponent },
  { path: 'lobby', component: LobbyComponent },
  { path: 'versus-menu', component: MainMenuComponent },
  { path: 'game', component: MainMenuComponent }, //deprecated, now goes to main menu
  { path: 'solo', component: MainMenuComponent }, //deprecated, now goes to main menu
  { path: 'versus', component: MainMenuComponent },
  { path: 'join', component: LobbyComponent },
  { path: 'join/:gameCode', component: LobbyComponent },
  { path: 'endless', component: GameComponent },
  { path: 'endless/:gameSeed', component: GameComponent },
  { path: 'challenge/:gameSeed', component: MainMenuComponent },
  { path: 'versus/:gameSeed', component: GameComponent },
  { path: 'daily', component: MainMenuComponent },
  { path: '**', redirectTo: '' },
];

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), WebSocketService, provideAnimations()],
}).catch((err) => console.error(err));
