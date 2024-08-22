import {
  Component,
  ElementRef,
  HostListener,
  Inject,
  Renderer2,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameComponent } from './game/game.component';
import { LobbyComponent } from './lobby/lobby.component';
import { HeaderComponent } from './header/header.component';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GameComponent, LobbyComponent, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'crossrace-ng';

  private lastTap = 0;
  private doubleTapThreshold = 300; // milliseconds

  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit() {
    // Prevent double tap zoom on iOS devices
    this.renderer.listen('document', 'touchstart', (event: TouchEvent) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - this.lastTap;

      if (tapLength < this.doubleTapThreshold && tapLength > 0) {
        event.preventDefault();
        console.log('Double tap prevented');
      }

      this.lastTap = currentTime;
    });

    this.renderer.listen('document', 'gesturestart', (event: Event) => {
      event.preventDefault();
    });
  }
}
