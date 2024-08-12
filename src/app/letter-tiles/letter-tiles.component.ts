import { Component, OnInit } from '@angular/core';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  transferArrayItem,
} from '@angular/cdk/drag-drop';

import { PUZZLES } from './puzzles';
import { VALID_WORDS } from './valid-words';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-letter-tiles',
  standalone: true,
  imports: [CdkDropListGroup, CdkDropList, CdkDrag, CommonModule],
  templateUrl: './letter-tiles.component.html',
  styleUrls: ['./letter-tiles.component.scss'],
})
export class LetterTilesComponent implements OnInit {
  bankLetters: string[] = [];
  grid: string[][] = [];
  gridCellIds: string[] = [];
  allDropListIds: string[] = ['letter-bank'];
  dragPosition = { x: -586, y: -586 };
  GRID_SIZE: number = 36;
  currentPuzzleIndex: number = 0;
  formedWords: string[] = [];

  ngOnInit(): void {
    this.startPuzzle();
  }

  startPuzzle() {
    this.setLettersFromPuzzle();
    this.initializeGrid();
    this.generateGridCellIds();
    this.allDropListIds = ['letter-bank', ...this.gridCellIds];
    this.updateFormedWords();
  }

  setLettersFromPuzzle() {
    this.bankLetters = [...PUZZLES[this.currentPuzzleIndex].letters];
  }

  initializeGrid() {
    this.grid = Array(this.GRID_SIZE)
      .fill(null)
      .map(() => Array(this.GRID_SIZE).fill(null));
  }

  generateGridCellIds() {
    this.gridCellIds = [];
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
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
    } else {
      const [prevI, prevJ] = this.getCellCoordinates(
        event.previousContainer.id
      );
      const [nextI, nextJ] = this.getCellCoordinates(event.container.id);

      if (event.previousContainer.id === 'letter-bank') {
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
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          0,
          event.currentIndex
        );
        this.grid[prevI][prevJ] = '';
      } else {
        if (this.isEmpty(this.grid[nextI][nextJ])) {
          this.grid[nextI][nextJ] = this.grid[prevI][prevJ];
          this.grid[prevI][prevJ] = '';
        } else {
          this.grid[nextI][nextJ] = this.grid[prevI][prevJ];
          this.grid[prevI][prevJ] = '';
        }
      }
    }

    this.updateFormedWords();
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

  nextPuzzle() {
    this.currentPuzzleIndex = (this.currentPuzzleIndex + 1) % PUZZLES.length;
    this.startPuzzle();
  }

  updateFormedWords() {
    this.formedWords = [];
    this.checkHorizontalWords();
    this.checkVerticalWords();
  }

  checkHorizontalWords() {
    for (let i = 0; i < this.GRID_SIZE; i++) {
      let word = '';
      for (let j = 0; j < this.GRID_SIZE; j++) {
        if (!this.isEmpty(this.grid[i][j])) {
          word += this.grid[i][j];
        } else {
          this.addWordIfValid(word);
          word = '';
        }
      }
      this.addWordIfValid(word);
    }
  }

  checkVerticalWords() {
    for (let j = 0; j < this.GRID_SIZE; j++) {
      let word = '';
      for (let i = 0; i < this.GRID_SIZE; i++) {
        if (!this.isEmpty(this.grid[i][j])) {
          word += this.grid[i][j];
        } else {
          this.addWordIfValid(word);
          word = '';
        }
      }
      this.addWordIfValid(word);
    }
  }

  addWordIfValid(word: string) {
    if (word.length >= 2 && !this.formedWords.includes(word)) {
      this.formedWords.push(word);
    }
  }
}
