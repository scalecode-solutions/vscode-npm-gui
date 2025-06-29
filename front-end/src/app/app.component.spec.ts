import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { LoadingScreenService } from './services/loading-screen/loading-screen.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let loadingScreenService: jasmine.SpyObj<LoadingScreenService>;

  beforeEach(async () => {
    const loadingScreenSpy = jasmine.createSpyObj('LoadingScreenService', ['show', 'hide', 'isLoading']);
    
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      declarations: [
        AppComponent
      ],
      providers: [
        { provide: LoadingScreenService, useValue: loadingScreenSpy }
      ]
    }).compileComponents();

    loadingScreenService = TestBed.inject(LoadingScreenService) as jasmine.SpyObj<LoadingScreenService>;
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should have access to the loading screen service', () => {
    expect(component.loadingScreen).toBeDefined();
    expect(component.loadingScreen).toBe(loadingScreenService);
  });
});
