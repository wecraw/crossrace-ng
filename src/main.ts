// crossrace-ng/src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, Routes } from '@angular/router';
import { LobbyComponent } from './app/components/lobby/lobby.component';
import { GameComponent } from './app/components/game/game.component';
import { WebSocketService } from './app/services/websocket/websocket.service';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MainMenuComponent } from './app/components/main-menu/main-menu.component';
import { GameConnectorComponent } from './app/components/game-connector/game-connector.component';
import { gameJoinGuard } from './app/guards/game-join.guard';
import { inGameGuard } from './app/guards/in-game.guard';
import { gameResolver } from './app/resolvers/game.resolver';

const routes: Routes = [
  // Main Menu
  {
    path: '',
    component: MainMenuComponent,
    pathMatch: 'full',
    data: { menu: 'main' },
  },

  // Singleplayer
  {
    path: 'daily',
    component: GameComponent,
    data: { gameMode: 'daily' },
    resolve: { gameData: gameResolver },
  },
  {
    path: 'practice',
    component: GameComponent,
    data: { gameMode: 'practice' },
    resolve: { gameData: gameResolver },
  },

  // Versus
  {
    path: 'versus-menu',
    component: MainMenuComponent,
    data: { menu: 'versus' },
  },
  { path: 'create', component: GameConnectorComponent },
  { path: 'join/:gameCode', component: GameConnectorComponent },
  {
    path: 'lobby/:gameCode',
    component: LobbyComponent,
    canActivate: [gameJoinGuard],
  },
  {
    path: 'versus/:gameCode',
    component: GameComponent,
    canActivate: [inGameGuard],
    data: { gameMode: 'versus' },
  },
  {
    path: 'disconnected',
    component: MainMenuComponent,
    data: { disconnected: true, menu: 'main' },
  },

  // 404
  { path: '**', redirectTo: '' },
];

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), WebSocketService, provideAnimations()],
}).catch((err) => console.error(err));
