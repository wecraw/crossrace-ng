import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogTutorial } from './dialog-tutorial.component';

describe('DialogTutorial', () => {
  let component: DialogTutorial;
  let fixture: ComponentFixture<DialogTutorial>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogTutorial],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogTutorial);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
