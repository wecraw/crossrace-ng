import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { Player } from '../../interfaces/player';
import { GameStateService } from '../../services/game-state/game-state.service';
import { GameState } from '../../interfaces/game-state';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.scss',
})
export class LeaderboardComponent implements OnInit, OnDestroy {
  @ViewChild('copiedTooltip') copiedTooltip!: MatTooltip;

  sortedPlayers: Player[] = [];
  gameState!: GameState;
  private readonly destroy$ = new Subject<void>();

  isShareSupported = false;
  isCopied = false;

  @Input()
  set players(value: Player[] | undefined) {
    // When the 'players' input is updated, filter out disconnected players,
    // then sort the remaining players by win count.
    this.sortedPlayers = [...(value || [])]
      .filter((player) => !player.disconnected)
      .sort((a, b) => b.winCount - a.winCount);
  }

  constructor(
    private gameStateService: GameStateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.isShareSupported =
      !!navigator.share &&
      /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);

    this.gameStateService
      .getGameState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.gameState = state;
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  copyOrShare(): void {
    if (!this.gameState || !this.gameState.gameCode) return;

    const gameShareUrl =
      window.location.origin + '/join/' + this.gameState.gameCode;
    const shareString = `Race me on Crossrace! \n${gameShareUrl}`;

    if (this.isShareSupported) {
      navigator.share({ text: shareString });
    } else {
      navigator.clipboard.writeText(gameShareUrl);
      this.isCopied = true;
      this.copiedTooltip.show();
      setTimeout(() => {
        this.copiedTooltip.hide();
        this.isCopied = false;
        this.cdr.detectChanges();
      }, 1500);
    }
  }
}
