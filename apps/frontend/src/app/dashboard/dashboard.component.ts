import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackgroundImageComponent } from './components/background-image.component';
import { DockerIconsComponent } from './components/docker-icons.component';
import { SystemResourcesComponent } from './components/system-resources.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    BackgroundImageComponent,
    SystemResourcesComponent,
    DockerIconsComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {}
