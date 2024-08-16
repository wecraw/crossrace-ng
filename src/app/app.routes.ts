import { Routes } from '@angular/router';
import { LobbyComponent } from './lobby/lobby.component';
import { GameComponent } from './game/game.component';

export const routes: Routes = [
  { path: 'lobby', component: LobbyComponent },
  { path: 'game', component: GameComponent },
];
