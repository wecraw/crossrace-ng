import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LetterTilesComponent } from './letter-tiles/letter-tiles.component';
import { LobbyComponent } from './lobby/lobby.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LetterTilesComponent, LobbyComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'crossrace-ng';
}
