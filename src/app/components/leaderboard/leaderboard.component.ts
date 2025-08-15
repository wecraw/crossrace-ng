// crossrace-ng/src/app/components/leaderboard/leaderboard.component.ts
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Player } from '../../interfaces/player';
import { ColorService } from '../../services/color/color.service';
import { AvatarService } from '../../services/avatar/avatar.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.scss',
})
export class LeaderboardComponent {
  sortedPlayers: Player[] = [];

  @Input()
  set players(value: Player[] | undefined) {
    // When the 'players' input is updated, filter out disconnected players,
    // then sort the remaining players by win count.
    this.sortedPlayers = [...(value || [])]
      .filter((player) => !player.disconnected)
      .sort((a, b) => b.winCount - a.winCount);
  }

  constructor(
    public colorService: ColorService,
    public avatarService: AvatarService,
  ) {}
}
