import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-system-resources',
  standalone: true,
  template: `
    <div class="system-resources">
      <h3>System Resources</h3>
      <ul>
        <li>CPU Usage: {{ cpuUsage }}%</li>
        <li>RAM Usage: {{ ramUsage }}%</li>
        <li>Disk Usage: {{ diskUsage }}%</li>
        <li>Active Services: {{ activeServices }}</li>
      </ul>
    </div>
  `,
  styles: [],
})
export class SystemResourcesComponent implements OnInit {
  cpuUsage: number = 0;
  ramUsage: number = 0;
  diskUsage: number = 0;
  activeServices: number = 0;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchSystemResources();
  }

  fetchSystemResources() {
    // Mock API call; replace with real API call
    this.http.get('/api/system-resources').subscribe((data: any) => {
      this.cpuUsage = data.cpuUsage;
      this.ramUsage = data.ramUsage;
      this.diskUsage = data.diskUsage;
      this.activeServices = data.activeServices;
    });
  }
}
