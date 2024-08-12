import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LetterTilesComponent } from './letter-tiles/letter-tiles.component';
import { LobbyComponent } from './lobby/lobby.component';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    LetterTilesComponent,
    LobbyComponent,
    HeaderComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'crossrace-ng';
}
