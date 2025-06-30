import {
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  Renderer2,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { DOCUMENT } from '@angular/common';
import { WebSocketService } from './websocket.service';
import { LoadingService } from './loading.service';
import { LoadingComponent } from './loading/loading.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, LoadingComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'crossrace-ng';

  private lastTap = 0;
  private doubleTapThreshold = 300; // milliseconds

  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private websocketService: WebSocketService,
    public loadingService: LoadingService,
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

  ngOnDestroy(): void {
    this.websocketService.disconnect();
  }
}
