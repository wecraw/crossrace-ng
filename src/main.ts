import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, Routes } from '@angular/router';
import { LobbyComponent } from './app/lobby/lobby.component';
import { GameComponent } from './app/game/game.component';
import { WebSocketService } from './app/websocket.service';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MainMenuComponent } from './app/main-menu/main-menu.component';
import { GameConnectorComponent } from './app/game-connector/game-connector.component';
import { gameJoinGuard } from './app/game-join.guard';
import { VersusMenuComponent } from './app/versus-menu/versus-menu.component';
import { inGameGuard } from './app/in-game.guard';

const routes: Routes = [
  // Main Menu
  { path: '', component: MainMenuComponent, pathMatch: 'full' },

  // Singleplayer
  { path: 'daily', component: GameComponent, data: { gameMode: 'daily' } },
  {
    path: 'practice',
    component: GameComponent,
    data: { gameMode: 'practice' },
  },

  // Versus
  { path: 'lobby', component: LobbyComponent },
  { path: 'versus-menu', component: VersusMenuComponent },
  { path: 'create', component: GameConnectorComponent },
  { path: 'join/:gameCode', component: GameConnectorComponent },
  {
    path: 'lobby/:gameCode',
    component: LobbyComponent,
    canActivate: [gameJoinGuard],
  },
  {
    path: 'versus',
    component: GameComponent,
    canActivate: [inGameGuard],
    data: { gameMode: 'versus' },
  },

  // 404
  { path: '**', redirectTo: '' },
];

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), WebSocketService, provideAnimations()],
}).catch((err) => console.error(err));
