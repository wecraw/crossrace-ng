// crossrace-ng/src/app/components/timer/timer.component.ts
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
  @Input() startTime: number = 0; // Used for setting initial time (e.g., on reconnect)
  @Output() timeChanged = new EventEmitter<number>();
  @Output() restart = new EventEmitter<String>();

  private timer: any;
  private seconds = 0;

  get formattedTime(): string {
    const minutes = Math.floor(this.seconds / 60);
    const remainingSeconds = Math.round(this.seconds % 60);
    return `${minutes}:${this.padNumber(remainingSeconds)}`;
  }

  ngOnInit(): void {
    this.seconds = this.startTime;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isRunning']) {
      if (this.isRunning) {
        this.startStopwatch();
      } else {
        this.stopStopwatch();
      }
    }
    // Sync the timer if startTime is updated from the parent
    if (
      changes['startTime'] &&
      changes['startTime'].currentValue !== this.seconds
    ) {
      this.setTimer(changes['startTime'].currentValue);
    }
  }

  resetTimer() {
    this.stopStopwatch();
    this.seconds = 0;
    this.timeChanged.emit(this.seconds);
  }

  setTimer(seconds: number) {
    this.seconds = seconds;
    this.timeChanged.emit(this.seconds);
  }

  private startStopwatch(): void {
    if (!this.timer) {
      this.timer = setInterval(() => {
        this.seconds++;
        this.timeChanged.emit(this.seconds);
      }, 1000);
    }
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
