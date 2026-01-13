import {AfterViewInit, Component, signal} from '@angular/core';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {NgIf} from '@angular/common';
import {LyricLine} from './models/lyric.model';

@Component({
  selector: 'app-root',
  imports: [NgIf],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  protected readonly title = signal('FrostLine');

  videoUrl: SafeUrl | null = null;

  lyrics: LyricLine[] = [];
  currentLine: string = "♪ Select a video and lyrics to start ♪";
  cardWidth: number = 600; // Starting width in px

  // The "Ruler"
  private canvas: HTMLCanvasElement = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D | null = this.canvas.getContext('2d');

  // Setup State
  jsonFileName: string | null = null; // To show selected filename
  isReady: boolean = false;

  constructor(private sanitizer: DomSanitizer) {
  }

  ngAfterViewInit() {
    // Optional: Set initial width for the placeholder text
    this.calculateWidth(this.currentLine);
  }

  // 1. Handle Video File
  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      this.videoUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file));
      this.checkReadiness();
    }
  }

  // 2. Handle JSON Lyrics File
  onLyricsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      this.jsonFileName = file.name;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Parse JSON content
          this.lyrics = JSON.parse(e.target?.result as string);
          // Sort just in case the JSON isn't in order
          this.lyrics.sort((a, b) => a.time - b.time);
          this.checkReadiness();
        } catch (err) {
          alert('Invalid JSON file!');
          console.error(err);
        }
      };
      reader.readAsText(file);
    }
  }

  checkReadiness() {
    if (this.videoUrl && this.lyrics.length > 0) {
      this.isReady = true;
    }
  }

  // 3. The Sync Engine (Runs every time video updates)
  onTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    const currentTime = video.currentTime;

    // Find the active lyric:
    // It's the last lyric where (lyric.time <= currentTime)
    // We reverse the array to find the *latest* match efficiently,
    // or just use findLast if targetting modern browsers.
    // Here is a safe, standard approach:

    const activeLyric = this.lyrics
      .filter(l => l.time <= currentTime) // Get all past lines
      .pop(); // Take the last one (most recent)

    const nextText = activeLyric ? activeLyric.text : "♪";

    // 2. ONLY update if the text is different (prevents jitter)
    if (nextText !== this.currentLine) {
      this.currentLine = nextText;
      this.calculateWidth(nextText);
    }
  }

  calculateWidth(text: string) {
    if (!this.ctx) return;

    // A. Match CSS EXACTLY: font-weight, font-size, font-family
    // Note: 2.5rem = 40px (assuming default root font size)
    this.ctx.font = "600 40px Inter, sans-serif";

    // B. Measure the text
    const metrics = this.ctx.measureText(text);

    // C. Add Padding (from SCSS: padding is 3rem 5rem)
    // 5rem left + 5rem right = 10rem. 10rem * 16px = 160px.
    const padding = 160;

    // D. Add a little buffer for "breathing room"
    const buffer = 20;

    this.cardWidth = Math.ceil(metrics.width + padding + buffer);
  }
}
