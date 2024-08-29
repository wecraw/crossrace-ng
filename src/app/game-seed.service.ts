import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GameSeedService {
  private readonly EPOCH_DATE = new Date('2024-08-20T00:00:00-04:00');

  getDailySeed(): number {
    const now = new Date();
    const easternTime = this.convertToEasternMidnight(now);
    const daysSinceEpoch = this.getDaysSinceEpoch(easternTime);
    return daysSinceEpoch;
  }

  private convertToEasternMidnight(date: Date): Date {
    const easternTime = new Date(
      date.toLocaleString('en-US', { timeZone: 'America/New_York' })
    );
    easternTime.setHours(0, 0, 0, 0);
    return easternTime;
  }

  private getDaysSinceEpoch(date: Date): number {
    const timeDiff = date.getTime() - this.EPOCH_DATE.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  }

  testDailySeed(testDate: Date): number {
    const easternTime = this.convertToEasternMidnight(testDate);
    const daysSinceEpoch = this.getDaysSinceEpoch(easternTime);
    console.log(`Test Date: ${testDate}`);
    console.log(`Eastern Midnight: ${easternTime}`);
    console.log(`Days Since Epoch: ${daysSinceEpoch}`);
    return daysSinceEpoch;
  }
}
