// timer.component.ts
import {
  Component,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
} from '@angular/core';

@Component({
  selector: 'app-timer',
  standalone: true,
  template: `
    <div>
      <div class="time">{{ formattedTime }}</div>
    </div>
  `,
  styles: [
    `
      .time {
        width: fit-content;
        background: #ffffffee;
        padding: 2px 10px;
        font-size: 20px;
        font-weight: 500;
        border-radius: 20px;
        border: 1px solid #ccc;
        margin: 16px 0;
        color: #444;
      }
    `,
  ],
})
export class TimerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isRunning = false;
  // For single player, the initial time to start from (e.g., from a saved state).
  @Input() startTime: number = 0;
  // For multiplayer, the absolute server UTC timestamp when the game started.
  @Input() serverStartTime: number | null = null;

  @Output() timeChanged = new EventEmitter<number>();
  @Output() restart = new EventEmitter<String>();

  private timer: any;
  private seconds = 0;

  get formattedTime(): string {
    const minutes = Math.floor(this.seconds / 60);
    const remainingSeconds = this.seconds % 60;
    return `${minutes}:${this.padNumber(remainingSeconds)}`;
  }

  ngOnInit(): void {
    this.seconds = this.startTime;
    this.timeChanged.emit(this.seconds);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isRunning']) {
      if (this.isRunning) {
        this.startStopwatch();
      } else {
        this.stopStopwatch();
      }
    }
    // If serverStartTime is updated (on game start or reconnect), and the timer
    // is running, restart it to ensure it's using the new value.
    if (changes['serverStartTime'] && this.isRunning) {
      this.stopStopwatch();
      this.startStopwatch();
    }
    // If the base startTime changes for a paused game, update the display.
    if (changes['startTime'] && !this.isRunning) {
      this.seconds = this.startTime;
      this.timeChanged.emit(this.seconds);
    }
  }

  resetTimer() {
    this.stopStopwatch();
    this.seconds = 0;
    this.timeChanged.emit(this.seconds);
  }

  private startStopwatch(): void {
    if (!this.timer) {
      // Immediately update the time to avoid a 1-second delay on start/resume.
      this.updateTime();
      this.timer = setInterval(() => {
        this.updateTime();
      }, 1000);
    }
  }

  private updateTime(): void {
    if (this.serverStartTime !== null) {
      // Multiplayer mode: Calculate elapsed time from the server's start time.
      const elapsedMilliseconds = Date.now() - this.serverStartTime;
      this.seconds = Math.max(0, Math.floor(elapsedMilliseconds / 1000));
    } else {
      // Single-player mode: Increment from the current time.
      this.seconds++;
    }
    this.timeChanged.emit(this.seconds);
  }

  private stopStopwatch(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private padNumber(num: number): string {
    return num.toString().padStart(2, '0');
  }

  ngOnDestroy(): void {
    this.stopStopwatch();
  }
}
