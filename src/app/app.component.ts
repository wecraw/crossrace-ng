import { Component, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { WebSocketService } from './services/websocket/websocket.service';
import { LoadingService } from './services/loading/loading.service';
import { LoadingComponent } from './components/loading/loading.component';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, LoadingComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'crossrace-ng';

  private lastTap = 0;
  private doubleTapThreshold = 300; // milliseconds

  // Debug properties
  isProduction = environment.production;

  constructor(
    private renderer: Renderer2,
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

  // Debug method for testing disconnections
  simulateDisconnect(): void {
    this.websocketService.simulateDisconnect();
  }
}
