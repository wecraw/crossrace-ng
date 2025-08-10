import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { GameStateService } from '../services/game-state/game-state.service';
import { GameSeedService } from '../services/game-seed/game-seed.service';
import { MatDialog } from '@angular/material/dialog';
import { EMPTY, Observable, of, switchMap, tap } from 'rxjs';
import { DialogPostGame } from '../components/dialogs/dialog-post-game/dialog-post-game.component';
import { PUZZLES } from '../components/game/puzzles';
import { DialogTutorial } from '../components/dialogs/dialog-tutorial/dialog-tutorial.component';

export interface GameResolverData {
  gameSeed: number;
  startTime: number;
}

const finishedDaily = (): boolean => {
  return localStorage.getItem('finishedDaily') === 'true';
};

const generateShareLink = (): string => {
  return window.location.origin;
};

export const gameResolver: ResolveFn<GameResolverData> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): Observable<GameResolverData> => {
  const gameStateService = inject(GameStateService);
  const gameSeedService = inject(GameSeedService);
  const router = inject(Router);
  const dialog = inject(MatDialog);

  const hasViewedTutorial = localStorage.getItem(
    'hasViewedSinglePlayerTutorial',
  );
  let tutorial$: Observable<any> = of(null);

  if (hasViewedTutorial !== 'true') {
    const dialogRef = dialog.open(DialogTutorial, {
      data: { isVersus: false },
      minWidth: 380,
      disableClose: true,
    });
    tutorial$ = dialogRef.afterClosed().pipe(
      tap(() => {
        localStorage.setItem('hasViewedSinglePlayerTutorial', 'true');
      }),
    );
  }

  return tutorial$.pipe(
    switchMap(() => {
      const gameMode = route.data['gameMode'] as 'daily' | 'practice';

      switch (gameMode) {
        case 'practice': {
          const gameSeed = Math.floor(Math.random() * PUZZLES.length);
          gameStateService.updateGameState({
            gameMode: 'practice',
            gameSeed,
          });
          return of({ gameSeed, startTime: 0 });
        }

        case 'daily': {
          const dailySeed = gameSeedService.getDailySeed();
          const storageSeed = localStorage.getItem('dailySeed');

          if (storageSeed && +storageSeed === dailySeed && finishedDaily()) {
            const finalTime = localStorage.getItem('finalTime');
            const finalGrid = localStorage.getItem('finalGrid');

            if (finalTime && finalGrid) {
              const dialogRef = dialog.open(DialogPostGame, {
                data: {
                  time: finalTime,
                  grid: JSON.parse(finalGrid),
                  winnerDisplayName: 'You',
                  daily: true,
                  singlePlayer: true,
                  shareLink: generateShareLink(),
                },
                minWidth: 380,
              });

              // Handle navigation when the dialog closes.
              dialogRef.afterClosed().subscribe((result) => {
                if (result && result.event === 'confirm') {
                  // The 'confirm' button in this dialog context means "Play Practice"
                  router.navigate(['/practice']);
                }
                // If the user quits or closes the dialog, they are already on the
                // home page, so no further action is needed.
              });
            }
            router.navigate(['/']);
            return EMPTY; // Cancel navigation to GameComponent
          }

          let startTime = 0;
          // Check for a game in progress only if it's today's daily
          if (storageSeed && +storageSeed === dailySeed) {
            const currentTime = localStorage.getItem('dailyCurrentTime');
            if (currentTime) {
              startTime = +currentTime;
            }
          } else {
            // It's a new daily puzzle day, clear old progress and set new seed
            localStorage.removeItem('dailyCurrentTime');
            localStorage.removeItem('finishedDaily');
            localStorage.removeItem('finalGrid');
            localStorage.removeItem('finalTime');
            localStorage.setItem('dailySeed', dailySeed.toString());
          }

          gameStateService.updateGameState({
            gameMode: 'daily',
            gameSeed: dailySeed,
          });
          return of({ gameSeed: dailySeed, startTime });
        }

        default:
          console.error('FATAL: gameResolver called with an invalid gameMode.');
          router.navigate(['/']);
          return EMPTY;
      }
    }),
  );
};
