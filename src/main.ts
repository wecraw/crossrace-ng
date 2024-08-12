import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, Routes } from '@angular/router';
import { LobbyComponent } from './app/lobby/lobby.component';
import { LetterTilesComponent } from './app/letter-tiles/letter-tiles.component';
import { WebSocketService } from './app/websocket.service';

const routes: Routes = [
  { path: '', component: LobbyComponent },
  { path: 'game', component: LetterTilesComponent },
  { path: 'join/:gameCode', component: LobbyComponent },
  { path: '**', redirectTo: '' },
];

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), WebSocketService],
}).catch((err) => console.error(err));
