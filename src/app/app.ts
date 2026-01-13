import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  signal,
  ViewChild,
  WritableSignal
} from '@angular/core';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {LyricLine} from './models/lyric.model';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements AfterViewInit {
  // --- Constants ---
  // The max pixel width before we force a line wrap
  readonly MAX_CARD_WIDTH = 600;

  // --- State Signals ---
  videoUrl: WritableSignal<SafeUrl | null> = signal(null);
  lyrics: WritableSignal<LyricLine[]> = signal([]);
  jsonFileName: WritableSignal<string | null> = signal(null);

  currentTime: WritableSignal<number> = signal(0);

  isReady = computed(() => !!this.videoUrl() && this.lyrics().length > 0);

  currentLine = computed(() => {
    const time = this.currentTime();
    const lines = this.lyrics();
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].time <= time) return lines[i].text;
    }
    return "♪";
  });

  // Calculate width, but CAP it at MAX_CARD_WIDTH
  cardWidth = computed(() => {
    return this.measureTextWidth(this.currentLine());
  });

  @ViewChild('videoRef') videoElement!: ElementRef<HTMLVideoElement>;

  private canvas: HTMLCanvasElement = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D | null = this.canvas.getContext('2d');

  constructor(private sanitizer: DomSanitizer) {
    effect(() => {
      if (this.isReady()) {
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.currentTime = 0;
        }
        setTimeout(() => {
          this.videoElement?.nativeElement.play().catch(e => console.warn(e));
        }, 1000);
      }
    });
  }

  ngAfterViewInit() {
    this.measureTextWidth(this.currentLine());
  }

  /* ... Keep onVideoSelected, onLyricsSelected, onTimeUpdate the same ... */
  onVideoSelected(event: Event): void { /* ... paste existing logic ... */
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      const objectUrl = URL.createObjectURL(file);
      this.videoUrl.set(this.sanitizer.bypassSecurityTrustUrl(objectUrl));
    }
  }

  onLyricsSelected(event: Event): void { /* ... paste existing logic ... */
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      this.jsonFileName.set(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
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

  onTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.currentTime.set(video.currentTime);
  }

  private measureTextWidth(text: string): number {
    if (!this.ctx) return 600;

    // Match CSS Font exactly
    this.ctx.font = "600 40px Inter, sans-serif";
    const metrics = this.ctx.measureText(text);

    // Padding Calculation (matches CSS padding: 3rem 4rem)
    // 4rem left + 4rem right = 8rem. 8 * 16px = 128px.
    const padding = 128;
    const buffer = 20;

    const calculatedWidth = Math.ceil(metrics.width + padding + buffer);

    // KEY LOGIC: Return the smaller of the two values.
    // If text is short, it returns calculatedWidth (snug fit).
    // If text is long, it returns MAX_CARD_WIDTH (forcing CSS wrap).
    return Math.min(calculatedWidth, this.MAX_CARD_WIDTH);
  }
}
