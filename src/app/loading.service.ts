import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  // A private writable signal to hold the loading state
  private loading = signal<boolean>(false);

  // A public readonly signal to expose the state to components.
  // Components can read this but cannot change it directly.
  public readonly isLoading = this.loading.asReadonly();

  constructor() {}

  /**
   * Shows the loading overlay.
   */
  show(): void {
    this.loading.set(true);
  }

  /**
   * Hides the loading overlay.
   */
  hide(): void {
    this.loading.set(false);
  }
}
