import {
  Component,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
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
        font-size: 2em;
        margin: 20px 0;
      }
    `,
  ],
})
export class TimerComponent implements OnDestroy, OnChanges {
  @Input() isRunning = false;
  @Output() timeChanged = new EventEmitter<number>();

  private timer: any;
  private seconds = 0;

  get formattedTime(): string {
    const minutes = Math.floor(this.seconds / 60);
    const remainingSeconds = this.seconds % 60;
    return `${this.padNumber(minutes)}:${this.padNumber(remainingSeconds)}`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isRunning']) {
      if (this.isRunning) {
        this.startStopwatch();
      } else {
        this.stopStopwatch();
      }
    }
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
