import { Routes } from '@angular/router';
import { LobbyComponent } from './lobby/lobby.component';
import { LetterTilesComponent } from './letter-tiles/letter-tiles.component';

export const routes: Routes = [
  { path: 'lobby', component: LobbyComponent },
  { path: 'game', component: LetterTilesComponent },
];
