import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { OnCreateDirective } from './on-create.directive';

// Test component to host the directive
@Component({
  template: `
    <div (onCreate)="onCreate()"></div>
  `
})
class TestComponent {
  onCreateCalled = false;
  
  onCreate() {
    this.onCreateCalled = true;
  }
}

describe('OnCreateDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        TestComponent,
        OnCreateDirective
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    const directiveEl = fixture.debugElement.query(By.directive(OnCreateDirective));
    expect(directiveEl).not.toBeNull();
    const directive = directiveEl.injector.get(OnCreateDirective);
    expect(directive).toBeTruthy();
  });

  it('should emit onCreate event after init', () => {
    expect(component.onCreateCalled).toBeTrue();
  });
});
