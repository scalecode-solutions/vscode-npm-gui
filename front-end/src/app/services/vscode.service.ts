import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

declare const acquireVsCodeApi: any;

@Injectable({
  providedIn: 'root'
})
export class VscodeService implements OnDestroy {
  private vscode: any;
  private messageCounter = 0;
  private pendingRequests: { [key: string]: (value: any) => void } = {};
  private versionSubject = new BehaviorSubject<string>('');

  constructor() {
    // Initialize the VS Code API
    this.vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
    
    // Set up message listener
    window.addEventListener('message', (event) => this.handleMessage(event));
    
    // Initialize version
    this.loadExtensionVersion();
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.handleMessage);
    this.versionSubject.complete();
  }

  private handleMessage(event: MessageEvent) {
    const message = event.data;
    if (message && message.messageId && this.pendingRequests[message.messageId]) {
      this.pendingRequests[message.messageId](message.payload);
      delete this.pendingRequests[message.messageId];
    }
  }

  /**
   * Sends a command to the extension and waits for a response
   */
  private sendCommand<T>(command: string, ...args: any[]): Promise<T> {
    return new Promise((resolve) => {
      if (!this.vscode) {
        console.warn('VS Code API not available');
        resolve(undefined as any);
        return;
      }

      const messageId = `msg_${Date.now()}_${this.messageCounter++}`;
      
      // Store the resolver to be called when we get a response
      this.pendingRequests[messageId] = resolve;
      
      // Send the message
      this.vscode.postMessage({
        command,
        parameter: args,
        messageId
      });
      
      // Set a timeout to clean up if we don't get a response
      setTimeout(() => {
        if (this.pendingRequests[messageId]) {
          console.warn(`Command ${command} timed out after 10 seconds`);
          delete this.pendingRequests[messageId];
          resolve(undefined as any);
        }
      }, 10000); // 10 second timeout
    });
  }

  /**
   * Loads the extension version and updates the version subject
   */
  private loadExtensionVersion(): void {
    if (!this.vscode) {
      this.versionSubject.next('Unknown');
      return;
    }
    
    this.sendCommand<{ result: string }>('getExtensionVersion')
      .then(response => {
        const version = response?.result || 'Unknown';
        this.versionSubject.next(version);
      })
      .catch(error => {
        console.error('Error getting extension version:', error);
        this.versionSubject.next('Unknown');
      });
  }

  /**
   * Gets the current extension version as an Observable
   */
  getExtensionVersion(): Observable<string> {
    return this.versionSubject.asObservable();
  }
}
