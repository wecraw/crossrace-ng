import { Component, OnInit } from '@angular/core';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  transferArrayItem,
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-letter-tiles',
  standalone: true,
  imports: [CdkDropListGroup, CdkDropList, CdkDrag],
  templateUrl: './letter-tiles.component.html',
  styleUrls: ['./letter-tiles.component.scss'],
})
export class LetterTilesComponent implements OnInit {
  bankLetters: string[] = [];
  grid: string[][] = [];
  gridCellIds: string[] = [];
  allDropListIds: string[] = ['letter-bank'];

  ngOnInit(): void {
    this.generateRandomLetters();
    this.initializeGrid();
    this.generateGridCellIds();
    this.allDropListIds = ['letter-bank', ...this.gridCellIds];
  }

  generateRandomLetters() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.bankLetters = Array.from(
      { length: 12 },
      () => alphabet[Math.floor(Math.random() * alphabet.length)]
    );
  }

  initializeGrid() {
    this.grid = Array(10)
      .fill(null)
      .map(() => Array(10).fill(null));
  }

  generateGridCellIds() {
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        this.gridCellIds.push(`cell-${i}-${j}`);
      }
    }
  }

  isEmpty(cell: string) {
    return cell === null || cell === '';
  }

  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      return;
    }

    const [prevI, prevJ] = this.getCellCoordinates(event.previousContainer.id);
    const [nextI, nextJ] = this.getCellCoordinates(event.container.id);

    if (event.previousContainer.id === 'letter-bank') {
      console.log('moving out of letter bank to grid');

      if (this.isEmpty(this.grid[nextI][nextJ])) {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          0
        );
        this.grid[nextI][nextJ] = event.container.data[0];
      }
    } else if (event.container.id === 'letter-bank') {
      console.log('moving out of grid to letter bank');
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        0,
        event.currentIndex
      );
      this.grid[prevI][prevJ] = '';
    } else {
      console.log('moving tile within grid');
      console.log(this.grid[nextI][nextJ]);

      if (this.isEmpty(this.grid[nextI][nextJ])) {
        this.grid[nextI][nextJ] = this.grid[prevI][prevJ];
        this.grid[prevI][prevJ] = '';
      } else {
        this.grid[nextI][nextJ] = this.grid[prevI][prevJ];
        this.grid[prevI][prevJ] = '';
      }
    }
  }

  getCellCoordinates(id: string): [number, number] {
    if (id === 'letter-bank') return [-1, -1];
    const [_, i, j] = id.split('-').map(Number);
    return [i, j];
  }

  canEnter = (drag: CdkDrag, drop: CdkDropList) => {
    if (drop.id === 'letter-bank') return true;
    const [i, j] = this.getCellCoordinates(drop.id);
    return this.isEmpty(this.grid[i][j]);
  };
}
