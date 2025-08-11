import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

// Lower number = higher priority.
const MessagePriorities: { [key: string]: number } = {
  'Game starting!': 1,
  'Creating game...': 5,
  'Joining game...': 5,
  'Reconnecting...': 10,
};
const DEFAULT_PRIORITY = 99;

// Interface for tracking each active loading operation.
interface ActiveOperation {
  id: symbol;
  message: string;
  priority: number;
}

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  // A private list of all currently active loading operations.
  private activeOperations: ActiveOperation[] = [];

  // Public, readonly signals for components to consume.
  private readonly loading = signal<boolean>(false);
  private readonly message = signal<string | undefined>(undefined);
  private readonly inGame = signal<boolean>(false);

  public readonly isLoading = this.loading.asReadonly();
  public readonly loadingMessage = this.message.asReadonly();
  public readonly isInGame = this.inGame.asReadonly();

  private readonly router = inject(Router);

  constructor() {}

  /**
   * Displays the loading spinner with a given message.
   * This method implements a token-based system with message prioritization.
   *
   * @param options - The configuration for the message to show.
   * @returns A `hide` function (a token) that must be called to end this specific loading operation.
   */
  show(options: { message: string }): () => void {
    const id = Symbol('loading-operation');
    const priority = MessagePriorities[options.message] ?? DEFAULT_PRIORITY;

    this.activeOperations.push({
      id,
      message: options.message,
      priority,
    });

    // If this is the first active operation, show the spinner.
    if (this.activeOperations.length === 1) {
      this.loading.set(true);
    }

    // Always re-evaluate which message should be displayed based on priority.
    this.updateDisplayedMessage();

    // Return the tokenized `hide` function.
    return () => {
      this.hide(id);
    };
  }

  /**
   * A convenience wrapper around `show` that automatically hides the spinner
   * after a specified duration.
   */
  async showAndHide(options: {
    message: string;
    duration: number;
  }): Promise<void> {
    const hide = this.show({ message: options.message });
    await new Promise((resolve) => setTimeout(resolve, options.duration));
    hide();
  }

  /**
   * The private hide method, called by the token function.
   * @param id - The unique symbol of the operation to remove.
   */
  private hide(id: symbol): void {
    this.activeOperations = this.activeOperations.filter((op) => op.id !== id);

    if (this.activeOperations.length === 0) {
      // If no operations are left, hide the spinner completely.
      this.loading.set(false);
      this.message.set(undefined);
      this.inGame.set(false);
    } else {
      // Otherwise, just re-evaluate which message to show.
      this.updateDisplayedMessage();
    }
  }

  /**
   * Updates the `message` and `inGame` signals based on the highest-priority
   * active operation.
   */
  private updateDisplayedMessage(): void {
    if (this.activeOperations.length === 0) {
      this.message.set(undefined);
      return;
    }

    // Sort to find the highest-priority message (lowest number).
    const highestPriorityOp = this.activeOperations.sort(
      (a, b) => a.priority - b.priority,
    )[0];

    this.message.set(highestPriorityOp.message);

    const isReconnecting = highestPriorityOp.message === 'Reconnecting...';
    this.inGame.set(isReconnecting && this.isOnVersusRoute());
  }

  private isOnVersusRoute(): boolean {
    const url = this.router.url;
    return url.startsWith('/versus/');
  }
}
