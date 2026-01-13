import {AfterViewInit, ChangeDetectionStrategy, Component, computed, signal, WritableSignal} from '@angular/core';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {LyricLine} from './models/lyric.model';

@Component({
  selector: 'app-root',
  imports: [], // No imports needed for @if
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements AfterViewInit {
  // State Signals
  videoUrl: WritableSignal<SafeUrl | null> = signal(null);
  lyrics: WritableSignal<LyricLine[]> = signal([]);
  jsonFileName: WritableSignal<string | null> = signal(null);

  // Playback State
  currentTime: WritableSignal<number> = signal(0);

  // Computed State
  isReady = computed(() => !!this.videoUrl() && this.lyrics().length > 0);

  // Efficiently derive the current line based on time
  currentLine = computed(() => {
    const time = this.currentTime();
    const lines = this.lyrics();

    // Iterate backwards to find the latest active line
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].time <= time) {
        return lines[i].text;
      }
    }
    return "♪"; // Default
  });

  // Calculate width whenever the text changes
  cardWidth = computed(() => {
    return this.measureTextWidth(this.currentLine());
  });

  // The "Ruler" (Off-screen canvas)
  private canvas: HTMLCanvasElement = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D | null = this.canvas.getContext('2d');

  constructor(private sanitizer: DomSanitizer) {
  }

  ngAfterViewInit() {
    // Initial measurement
    this.measureTextWidth(this.currentLine());
  }

  // 1. Handle Video File
  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      const objectUrl = URL.createObjectURL(file);
      this.videoUrl.set(this.sanitizer.bypassSecurityTrustUrl(objectUrl));
    }
  }

  // 2. Handle JSON Lyrics File
  onLyricsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      this.jsonFileName.set(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          // Sort to ensure time order
          parsed.sort((a: LyricLine, b: LyricLine) => a.time - b.time);
          this.lyrics.set(parsed);
        } catch (err) {
          alert('Invalid JSON file!');
          console.error(err);
        }
      };
      reader.readAsText(file);
    }
  }

  // 3. The Sync Engine
  onTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.currentTime.set(video.currentTime);
  }

  private measureTextWidth(text: string): number {
    if (!this.ctx) return 600;

    // A. Match CSS EXACTLY: font-weight font-size font-family
    this.ctx.font = "600 40px Inter, sans-serif";

    // B. Measure
    const metrics = this.ctx.measureText(text);

    // C. Padding (160px) + Buffer (20px)
    // Matches SCSS padding: 3rem 5rem (5rem * 16px * 2 sides = 160px)
    return Math.ceil(metrics.width + 160 + 20);
  }
}
