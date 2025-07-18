import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-menu-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-layout.component.html',
  styleUrls: ['./menu-layout.component.scss'],
})
export class MenuLayoutComponent implements OnInit {
  // Properties moved from MainMenuComponent
  grid: string[][] = [];
  GRID_SIZE: number = 12;
  version = environment.version?.displayVersion || '<version info not found>';

  private router = inject(Router);

  ngOnInit(): void {
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
