import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-background-image',
  standalone: true,
  template: `
    <div
      class="background-container"
      [style.backgroundImage]="backgroundImageUrl"
    >
      <ng-content></ng-content>
      <!-- This will hold other components in the background -->
    </div>
  `,
  styles: [],
})
export class BackgroundImageComponent {
  @Input() backgroundImageUrl: string = 'url("/assets/default-background.jpg")';

  // Method to dynamically change the background image (can be triggered by user actions)
  changeBackgroundImage(imageUrl: string) {
    this.backgroundImageUrl = `url(${imageUrl})`;
  }
}
