import { Component, Input, OnInit } from '@angular/core';
import { Player } from '../interfaces/player';

@Component({
    selector: 'app-leaderboard',
    imports: [],
    templateUrl: './leaderboard.component.html',
    styleUrl: './leaderboard.component.scss'
})
export class LeaderboardComponent implements OnInit {
  @Input() players: Player[] = [];
  sortedPlayers: Player[] = [];

  ngOnInit() {
    this.sortPlayers();
  }

  sortPlayers() {
    this.sortedPlayers = [...this.players].sort(
      (a, b) => b.winCount - a.winCount,
    );
  }
}
