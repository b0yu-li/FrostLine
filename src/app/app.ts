import {Component, signal} from '@angular/core';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [NgIf],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('FrostLine');

  videoUrl: SafeUrl | null = null;

  constructor(private sanitizer: DomSanitizer) {
  }

  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]) {
      const file = input.files[0];

      // 1. Create a temporary URL for the selected file
      const objectUrl = URL.createObjectURL(file);

      // 2. Bypass security trust for this specific URL
      this.videoUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
    }
  }
}
