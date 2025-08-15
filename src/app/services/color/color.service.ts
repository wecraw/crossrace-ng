import { Injectable } from '@angular/core';
import { COLORS } from '../../constants/colors';

@Injectable({
  providedIn: 'root',
})
export class ColorService {
  private allColors: string[] = COLORS;

  getColors(): string[] {
    return this.allColors;
  }

  getColorById(id: number): string {
    const color = this.allColors[id];
    return color ? color : '#b50000';
  }
}
