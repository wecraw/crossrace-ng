import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LetterTilesComponent } from './letter-tiles/letter-tiles.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LetterTilesComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'crossrace-ng';
}
