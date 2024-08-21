import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GameSeedService {
  private readonly EPOCH_DATE = new Date('2024-08-20T00:00:00-04:00');

  getDailySeed(): number {
    const now = new Date();
    const easternTime = this.convertToEasternTime(now);
    const daysSinceEpoch = this.getDaysSinceEpoch(easternTime);
    return daysSinceEpoch;
  }

  private convertToEasternTime(date: Date): Date {
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const easternOffset = -4; // EDT offset, adjust for EST if needed
    return new Date(utc + 3600000 * easternOffset);
  }

  private getDaysSinceEpoch(date: Date): number {
    const timeDiff = date.getTime() - this.EPOCH_DATE.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  }
}
