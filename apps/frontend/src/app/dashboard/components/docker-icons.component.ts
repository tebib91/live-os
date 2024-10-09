import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-docker-icons',
  standalone: true,
  template: `
    <div class="docker-icons">
      <h3>Running Docker Containers</h3>
      <div class="icon-grid">
        <div *ngFor="let container of containers" class="icon-container">
          <img [src]="getIcon(container.image)" alt="{{ container.name }}" />
          <p>{{ container.name }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class DockerIconsComponent implements OnInit {
  containers: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchDockerContainers();
  }

  fetchDockerContainers() {
    // Replace with actual API call
    this.http.get('/api/docker-containers').subscribe((data: any) => {
      this.containers = data.containers;
    });
  }

  getIcon(image: string): string {
    if (image.includes('nginx')) return '/assets/icons/nginx.png';
    if (image.includes('mysql')) return '/assets/icons/mysql.png';
    return '/assets/icons/default.png'; // Default icon
  }
}
