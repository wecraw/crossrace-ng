import {
  Component,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { GameSeedService } from '../../services/game-seed/game-seed.service';
import { ConfigService } from '../../services/config/config.service';
import { DialogTutorial } from '../dialogs/dialog-tutorial/dialog-tutorial.component';
import { DialogPostGame } from '../dialogs/dialog-post-game/dialog-post-game.component';
import { Dialog } from '../dialogs/dialog/dialog.component';

@Component({
  selector: 'app-main-menu', // Changed from 'app-game' to avoid conflict
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.scss'],
})
export class MainMenuComponent implements OnInit {
  // --- Properties from merged components ---
  grid: string[][] = [];
  GRID_WIDTH: number = 36;
  GRID_HEIGHT: number = 12;
  version: string = '';
  joinGameForm!: FormGroup;

  @ViewChild('roomCodeInput') roomCodeInput!: ElementRef<HTMLInputElement>;

  // --- Combined dependencies ---
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private gameSeedService = inject(GameSeedService);
  private configService = inject(ConfigService);
  private fb = inject(FormBuilder);
  readonly dialog = inject(MatDialog);

  // --- State for conditional rendering and animation ---
  activeMenu: 'main' | 'versus' | 'create' | 'join' = 'main';

  ngOnInit(): void {
    // Logic from MenuLayoutComponent: Initialize background grid and version
    this.version = this.configService.displayVersion;
    this.initializeGrid();

    // Determine which menu to show from route data for initial load
    this.activeMenu = this.route.snapshot.data['menu'] || 'main';

    // Logic from MainMenuComponent: Handle disconnected state
    if (this.route.snapshot.data['disconnected']) {
      this.openDisconnectedDialog();
    }

    // Always initialize the join form
    this.joinGameForm = this.fb.group({
      gameCode: [
        '',
        [
          Validators.required,
          Validators.minLength(4),
          Validators.maxLength(4),
          Validators.pattern('^[A-Za-z]{4}$'),
        ],
      ],
      playerName: [
        '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(12),
        ],
      ],
    });
  }

  // --- Methods for View Switching ---

  /**
   * Switches the view to the 'versus' menu, triggering the slide animation.
   */
  switchToVersus(): void {
    this.activeMenu = 'versus';
  }

  /**
   * Switches the view back to the 'main' menu, triggering the slide animation.
   */
  switchToMain(): void {
    this.activeMenu = 'main';
  }

  /**
   * Switches the view to the 'versus' menu, triggering the slide animation.
   */
  switchToCreate(): void {
    this.activeMenu = 'create';
  }

  /**
   * Switches the view to the 'join' menu and focuses the input.
   */
  switchToJoin(): void {
    this.activeMenu = 'join';
    setTimeout(() => {
      this.roomCodeInput?.nativeElement.focus();
    }, 500); // Match animation duration
  }

  /**
   * Creates the 2D array for the decorative background grid.
   */
  initializeGrid(): void {
    this.grid = Array(this.GRID_HEIGHT)
      .fill(null)
      .map(() => Array(this.GRID_WIDTH).fill(null));
  }

  // --- Methods from MainMenuComponent ---

  /**
   * Opens a dialog to inform the user they were disconnected
   */
  openDisconnectedDialog(): void {
    this.dialog.open(Dialog, {
      data: {
        dialogText: 'Disconnected',
        showSpinner: false,
        showConfirm: true,
        confirmText: 'Ok',
      },
      minWidth: 380,
    });
  }

  /**
   * Sets up the daily game seed and navigates to the daily game.
   */
  daily(): void {
    const storageSeed = localStorage.getItem('dailySeed');
    const dailySeed = this.gameSeedService.getDailySeed();
    if (storageSeed === null) {
      localStorage.setItem('dailySeed', '' + dailySeed);
      localStorage.setItem('dailyCurrentTime', '0');
      localStorage.setItem('finishedDaily', 'false');
    } else {
      if (+storageSeed !== dailySeed) {
        localStorage.setItem('finishedDaily', 'false');
        localStorage.setItem('dailyCurrentTime', '0');
        localStorage.setItem('dailySeed', '' + dailySeed);
      }
    }
    this.router.navigate(['/daily']);
  }

  /**
   * Navigates to the practice mode.
   */
  practice(): void {
    this.router.navigate(['/practice']);
  }

  openTutorialDialog(data: any): void {
    this.dialog.open(DialogTutorial, {
      data: data,
      minWidth: 380,
    });
  }

  openPostGameDialog(data: any): void {
    const dialogRef = this.dialog.open(DialogPostGame, {
      data: data,
      minWidth: 380,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.event === 'confirm') {
        this.router.navigate(['/practice']);
      } else {
        this.router.navigate(['/']);
      }
    });
  }

  /**
   * Navigates to the game connector to create a new game.
   */
  createGame(): void {
    this.router.navigate(['/create']);
  }

  /**
   * Validates the form and navigates to the game connector to join a game.
   */
  joinGame(): void {
    if (this.joinGameForm.valid) {
      const gameCode = this.joinGameForm.get('gameCode')?.value;
      const playerName = this.joinGameForm.get('playerName')?.value;
      this.router.navigate(['/join', gameCode], {
        queryParams: { name: playerName },
      });
    } else {
      console.log('Form is invalid');
      this.joinGameForm.markAllAsTouched();
    }
  }

  /**
   * Sanitizes the input for the game code field.
   * @param event The input event from the text field.
   */
  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
    this.joinGameForm.patchValue({ gameCode: input.value });
  }
}
