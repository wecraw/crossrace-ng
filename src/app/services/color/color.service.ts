import { Injectable } from '@angular/core';
import { COLORS } from '../../constants/colors';
import { Color } from '../../interfaces/color';

@Injectable({
  providedIn: 'root',
})
export class ColorService {
  private allColors: Color[] = COLORS;

  getColors(): Color[] {
    return this.allColors;
  }

  getColorById(id: number): Color {
    const color = this.allColors.find((color) => color.id === id);
    return color ? color : COLORS[0];
  }
}
