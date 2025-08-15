import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { COLORS } from '../../constants/colors';
import { Player } from '../../interfaces/player';
import { ColorService } from '../../services/color/color.service';
import { AvatarService } from '../../services/avatar/avatar.service';
import { Color } from '../../interfaces/color';

@Component({
  selector: 'player-card',
  imports: [CommonModule, FormsModule],
  templateUrl: './player-card.component.html',
  styleUrl: './player-card.component.scss',
})
export class PlayerCardComponent {
  @Input() player!: Player;
  @Input() playerIndex: number = 0;
  @Input() allowEdit: boolean = false;

  @Output() onColorChange: EventEmitter<number> = new EventEmitter<number>();
  @Output() onAvatarChange: EventEmitter<number> = new EventEmitter<number>();

  colorGrid: Color[] = COLORS;
  private totalAvatars: number;

  constructor(
    public colorService: ColorService,
    public avatarService: AvatarService,
  ) {
    this.totalAvatars = this.avatarService.getAvatars().length;
  }

  avatarScroll(direction: 'left' | 'right') {
    if (!this.allowEdit) return;

    let currentId = this.player.avatarId;

    if (direction === 'left') {
      // Decrement and wrap around if it goes below 1
      currentId = currentId - 1 < 1 ? this.totalAvatars : currentId - 1;
    } else {
      // Increment and wrap around if it exceeds totalAvatars
      currentId = currentId + 1 > this.totalAvatars ? 1 : currentId + 1;
    }

    this.player.avatarId = currentId;
    this.onAvatarChange.emit(this.player.avatarId);
  }

  colorScroll(direction: 'left' | 'right') {
    if (direction === 'left') {
      this.player.colorId--;
    } else {
      this.player.colorId++;
    }
    this.onColorChange.emit(this.player.colorId);
  }
}
