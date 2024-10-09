import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NxWelcomeComponent } from './nx-welcome.component';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  imports: [NxWelcomeComponent, RouterModule],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'frontend';
  status: string = 'Fetching...';
  cpuUsage: number = 0;
  ramUsage: number = 0;

  constructor(private http: HttpClient) {
    this.getStatus();
  }

  getStatus() {
    this.http
      .get<{ message: string; cpu: number; ram: number }>(
        'http://localhost:3000/api/status'
      )
      .subscribe((response) => {
        this.status = response.message;
        this.cpuUsage = response.cpu;
        this.ramUsage = response.ram;
      });
  }
}
