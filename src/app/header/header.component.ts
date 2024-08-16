import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  constructor(private router: Router) {}

  navigateToSingleplayer() {
    this.router.navigate(['/']);
  }

  navigateToMultiplayer() {
    this.router.navigate(['/lobby']);
  }
}
