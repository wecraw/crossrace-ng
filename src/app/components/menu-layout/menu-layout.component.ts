import { Component, OnInit, inject } from '@angular/core';

import { Router } from '@angular/router';
import { ConfigService } from '../../services/config/config.service';

@Component({
  selector: 'app-menu-layout',
  imports: [],
  templateUrl: './menu-layout.component.html',
  styleUrls: ['./menu-layout.component.scss'],
})
export class MenuLayoutComponent implements OnInit {
  // Properties moved from MainMenuComponent
  grid: string[][] = [];
  GRID_SIZE: number = 12;
  version: string = '';

  private router = inject(Router);
  private configService = inject(ConfigService);

  ngOnInit(): void {
    this.version = this.configService.displayVersion;
    this.initializeGrid();
  }

  /**
   * Navigates to the home page when the logo is clicked.
   */
  navigateHome(): void {
    this.router.navigate(['/']);
  }

  /**
   * Creates the 2D array for the decorative background grid.
   */
  initializeGrid(): void {
    this.grid = Array(this.GRID_SIZE)
      .fill(null)
      .map(() => Array(this.GRID_SIZE).fill(null));
  }
}
