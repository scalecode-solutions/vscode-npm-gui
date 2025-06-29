// Core Angular
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';

// Models and Types
import { FilterSearchTypes } from 'src/app/models/filter-search-type';
import { PackageSource } from '../../../../../src/models/option.model';
import { PackageDetail, Project } from '../../../../../src/models/project.model';
import { CommandResult } from 'src/app/models/command-result';

// Services
import { AlertService } from 'src/app/services/alert-service/alert.service';
import { CommandService } from 'src/app/services/command-service/command.service';
import { LoadingScreenService } from 'src/app/services/loading-screen/loading-screen.service';
import { VscodeService } from 'src/app/services/vscode.service';

// Shared Utilities
import { getPackageSourceWebUrl } from 'src/app/shared/component-shared';
import { Subscription } from 'rxjs';



@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss'],
})
export class ProjectListComponent implements OnInit, AfterViewInit, OnDestroy {
  extensionVersion: string = '';
  projects: Project[] = [];
  packageListVersion: Record<string, string> = {};
  packageSources: PackageSource[] = [];
  originalPackageSources: PackageSource[] = [];
  searchValue: string = '';
  filterType: FilterSearchTypes = FilterSearchTypes.Contains;
  isLoading: boolean = false;
  loadingMessage: string = 'Loading...';
  filterSearchTypes = FilterSearchTypes;

  private subscriptions = new Subscription();

  constructor(
    private loading: LoadingScreenService,
    private commandSrv: CommandService,
    private alertSrv: AlertService,
    private vscodeService: VscodeService,
    private cd: ChangeDetectorRef
  ) {
    this.commandSrv.changeProjects.subscribe((res: string) => {
      if (res === 'getData') {
        this.getData();
      }
    });
  }

  ngOnInit(): void {
    // Subscribe to version updates
    this.subscriptions.add(
      this.vscodeService.getExtensionVersion().subscribe(version => {
        if (version) {
          this.extensionVersion = version;
          this.cd.detectChanges();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  ngAfterViewInit(): void {
    this.loadPackageVersion(false);
    this.commandSrv.getPackageSources().subscribe((response: CommandResult<PackageSource[]>) => {
      if (Array.isArray(response.result)) {
        this.packageSources = response.result;
        this.originalPackageSources = [...response.result];
      }
    });
  }

  getData(): void {
    this.isLoading = true;
    this.loadingMessage = 'Loading projects...';
    this.commandSrv.getData().subscribe(
      (res: CommandResult<Project[]>) => {
        this.projects = res.result || [];
        this.isLoading = false;
        this.cd.detectChanges();
      },
      (err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        this.alertSrv.error(errorMessage);
        this.isLoading = false;
        this.cd.detectChanges();
      }
    );
  }

  loadPackageVersion(loadVersion: boolean = true): void {
    this.isLoading = true;
    this.loadingMessage = 'Loading package versions...';
    this.commandSrv.reload(loadVersion).subscribe(
      (res: CommandResult<Project[]>) => {
        // Store the package versions in a way that matches the expected structure
        this.packageListVersion = {};
        res.result?.forEach(project => {
          project.packages?.forEach(pkg => {
            if (pkg.packageName) {
              const key = `${project.id}.${pkg.packageName}`;
              this.packageListVersion[key] = pkg.packageVersion;
            }
          });
        });
        this.getData();
      },
      (err: unknown) => {
        this.isLoading = false;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        this.alertSrv.error(errorMessage);
        this.cd.detectChanges();
      }
    );
  }

  updateAllProjects(): void {
    if (this.projects.length === 0) {
      return;
    }

    // Use window.confirm for now since AlertService doesn't have a confirm method
    const confirm = window.confirm(`Are you sure you want to update all ${this.projects.length} projects?`);
    if (!confirm) {
      return;
    }
      
    this.isLoading = true;
    this.loadingMessage = 'Updating all packages...';
    this.cd.detectChanges();
    
    // First ensure we have the latest package versions
    this.commandSrv.reload(true).subscribe({
      next: () => {
        // Then update all projects
        this.commandSrv.updateAllProjects().subscribe({
          next: () => {
            this.alertSrv.success('All packages updated successfully!');
            this.isLoading = false;
            this.loadPackageVersion(false);
          },
          error: (err: unknown) => {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            this.alertSrv.error(`Failed to update packages: ${errorMessage}`);
            this.isLoading = false;
            this.cd.detectChanges();
          }
        });
      },
      error: (err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        this.alertSrv.error(`Failed to load package versions: ${errorMessage}`);
        this.isLoading = false;
        this.cd.detectChanges();
      }
    });
  }

  getVersion(pkg: PackageDetail): string {
    if (!pkg) { 
      return 'Unknown'; 
    }
    const knownVersion = pkg.newerVersion && pkg.newerVersion !== 'Unknown';
    return pkg.isUpdated && knownVersion ? 'Yes' : knownVersion ? 'No' : 'Unknown';
  }

  getVersionStyle(pkg: PackageDetail): string {
    if (!pkg) { 
      return 'badge badge-secondary'; 
    }
    const knownVersion = pkg.newerVersion && pkg.newerVersion !== 'Unknown';
    
    return pkg.isUpdated && knownVersion
      ? 'badge badge-success'
      : knownVersion
        ? 'badge badge-danger'
        : 'badge badge-secondary';
  }

  updatePackage(project: Project, pkg: PackageDetail): void {
    if (!project || !pkg || !pkg.packageName) {
      console.error('Invalid project or package');
      return;
    }

    this.isLoading = true;
    this.loadingMessage = `Updating ${pkg.packageName}...`;
    this.cd.detectChanges();
    
    const projectId = project.id || 0;
    const selectedVersion = this.getSelectedVersion(projectId, pkg.packageName);
    
    this.commandSrv
      .updatePackage(projectId, pkg.packageName, selectedVersion)
      .subscribe({
        next: () => {
          this.alertSrv.success(`Package ${pkg.packageName} updated successfully!`);
          this.isLoading = false;
          this.loadPackageVersion(false);
        },
        error: (err: unknown) => {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          this.alertSrv.error(`Failed to update ${pkg.packageName}: ${errorMessage}`);
          this.isLoading = false;
          this.cd.detectChanges();
        }
      });
  }

  removePackage(project: Project, pkg: PackageDetail): void {
    if (!project || !pkg || !pkg.packageName) {
      console.error('Invalid project or package');
      return;
    }

    const confirmRemove = window.confirm(`Are you sure you want to remove ${pkg.packageName}?`);
    if (!confirmRemove) {
      return;
    }
    
    this.isLoading = true;
    this.loadingMessage = `Removing ${pkg.packageName}...`;
    this.cd.detectChanges();
    
    const projectId = project.id || 0;
    const selectedVersion = this.getSelectedVersion(projectId, pkg.packageName);
    
    this.commandSrv
      .removePackage(projectId, pkg.packageName, selectedVersion)
      .subscribe({
        next: () => {
          this.alertSrv.success(`Package ${pkg.packageName} removed successfully!`);
          this.isLoading = false;
          this.loadPackageVersion(false);
        },
        error: (err: unknown) => {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          this.alertSrv.error(`Failed to remove ${pkg.packageName}: ${errorMessage}`);
          this.isLoading = false;
          this.cd.detectChanges();
        }
      });
  }

  removeAll(projectId: number, packageName: string): void {
    if (typeof projectId !== 'number' || !packageName) {
      console.error('Invalid projectId or packageName');
      return;
    }

    this.commandSrv.removeAllPackage(projectId, packageName).subscribe({
      next: () => {
        this.getData();
      },
      error: (err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        this.alertSrv.error(`Failed to remove all packages: ${errorMessage}`);
        this.cd.detectChanges();
      }
    });
  }

  change(id: number, packageName: string, value: string): void {
    if (typeof id !== 'number' || !packageName) {
      console.error('Invalid id or packageName');
      return;
    }
    this.packageListVersion[`${id}.${packageName}`] = value;
  }

  getSelectedVersion(projectId: number, packageName: string): string {
    if (typeof projectId !== 'number' || !packageName) {
      console.error('Invalid projectId or packageName');
      return '';
    }
    return this.packageListVersion[`${projectId}.${packageName}`] || '';
  }

  searchFilter(packageName: string | undefined): boolean {
    if (!packageName) { 
      return false; 
    }
    
    if (!this.searchValue || this.searchValue.trim() === '') {
      return true;
    }
    
    const searchTerm = this.searchValue.toLowerCase().trim();
    const name = packageName.toLowerCase();
    
    return this.filterType === FilterSearchTypes.Contains
      ? name.includes(searchTerm)
      : name.startsWith(searchTerm);
  }

  onSwitchFilterType(): void {
    this.cd.detectChanges();
  }

  onSearch(): void {
    this.cd.detectChanges();
  }

  getOutdatedCount(project: Project): number {
    if (!project || !project.packages || !Array.isArray(project.packages)) {
      return 0;
    }
    
    return project.packages.filter((pkg: PackageDetail) => {
      return pkg && pkg.newerVersion && pkg.newerVersion !== 'Unknown' && !pkg.isUpdated;
    }).length;
  }

  showPackageVersions(project: Project, pkg: PackageDetail): void {
    if (!project || !pkg || !pkg.packageName) {
      console.error('Invalid project or package');
      return;
    }
    
    // This will be implemented to show a modal/dialog with version history
    console.log(`Show versions for ${pkg.packageName} in ${project.projectName}`);
    // TODO: Implement version selection dialog
  }
  


  // Re-export the getPackageSourceWebUrl function with type safety
  getPackageSourceWebUrl(packageName: string, version: string, source: string): string {
    // @ts-ignore - The function is defined in the shared utilities
    return getPackageSourceWebUrl(packageName, version, source);
  }
}
