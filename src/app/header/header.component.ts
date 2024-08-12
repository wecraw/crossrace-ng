import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule],
  template: `
    <header class="header">
      <nav>
        <a class="nav-link" routerLink="/lobby" routerLinkActive="active"
          >Multiplayer</a
        >
      </nav>
    </header>
  `,
  styles: [
    `
      .header {
        height: 75px;
        background-color: #ccc;
        width: 100vw;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 0 20px;
        box-sizing: border-box;
      }
      .nav-link {
        color: black;
        text-decoration: none;
        cursor: pointer;
      }
    `,
  ],
})
export class HeaderComponent {}
