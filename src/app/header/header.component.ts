import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule],
  template: `
    <header class="header">
      <h2>Crossrace</h2>
      <div class="version" style="margin-right: auto">(0.2.1)</div>
      <nav class="d-flex">
        <a
          style="margin-right: 35px;"
          class="nav-link"
          routerLink="/"
          routerLinkActive="active"
          >Singleplayer</a
        >
        <a class="nav-link" routerLink="/lobby" routerLinkActive="active"
          >Multiplayer</a
        >
      </nav>
    </header>
  `,
  styles: [
    `
      .header {
        height: 50px;
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
      .version {
        font-size: 10px;
      }
    `,
  ],
})
export class HeaderComponent {}
