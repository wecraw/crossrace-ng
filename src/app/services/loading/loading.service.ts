import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  /**
   * This duration should match the fade-in animation duration in the
   * loading component. It ensures that the fade-in animation has time to
   * complete before the component is hidden, even for very short loading
   * operations.
   */
  private readonly MIN_DURATION_MS = 250;

  // A private writable signal to hold the loading state
  private loading = signal<boolean>(false);
  private message = signal<string | undefined>(undefined);
  private inGame = signal<boolean>(false);

  // Timestamp of when the loader was shown.
  private showTime = 0;

  // A public readonly signal to expose the state to components.
  // Components can read this but cannot change it directly.
  public readonly isLoading = this.loading.asReadonly();
  public readonly loadingMessage = this.message.asReadonly();
  public readonly isInGame = this.inGame.asReadonly();

  private readonly router = inject(Router);

  constructor() {}

  /**
   * Checks if the current route is a versus route (/versus or /versus/:gameCode)
   */
  private isOnVersusRoute(): boolean {
    const url = this.router.url;
    return url === '/versus' || url.startsWith('/versus/');
  }

  /**
   * Shows the loading overlay.
   */
  show(options?: { message?: string; inGame?: boolean }): void {
    this.showTime = Date.now();
    this.message.set(options?.message);
    // Use provided inGame value, or auto-detect based on current route
    const shouldBeInGame = options?.inGame ?? this.isOnVersusRoute();
    this.inGame.set(shouldBeInGame);
    this.loading.set(true);
  }

  /**
   * Shows the loading overlay for a fixed duration.
   * Does not need to be manually hidden.
   */
  async showForDuration(options: {
    message?: string;
    duration: number;
    inGame?: boolean;
  }): Promise<void> {
    const showTimeForThisCall = Date.now();
    this.show({ message: options.message, inGame: options.inGame });

    return new Promise((resolve) => {
      setTimeout(() => {
        // Only hide if another `show()` hasn't been called in the meantime.
        if (this.showTime === showTimeForThisCall) {
          this.hide();
        }
        resolve();
      }, options.duration);
    });
  }

  /**
   * Hides the loading overlay, ensuring it's visible for at least the minimum duration.
   */
  hide(): void {
    const showTimeAtHide = this.showTime;
    const elapsed = Date.now() - showTimeAtHide;

    if (elapsed >= this.MIN_DURATION_MS) {
      this.loading.set(false);
      this.message.set(undefined);
      this.inGame.set(false);
    } else {
      setTimeout(() => {
        // Only hide if another `show()` hasn't been called in the meantime.
        if (this.showTime === showTimeAtHide) {
          this.loading.set(false);
          this.message.set(undefined);
          this.inGame.set(false);
        }
      }, this.MIN_DURATION_MS - elapsed);
    }
  }
}
