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
  // --- State Signals ---
  videoUrl: WritableSignal<SafeUrl | null> = signal(null);
  lyrics: WritableSignal<LyricLine[]> = signal([]);
  jsonFileName: WritableSignal<string | null> = signal(null);

  // Playback State
  currentTime: WritableSignal<number> = signal(0);

  // --- Computed State ---
  // Ready only when BOTH video and lyrics are present
  isReady = computed(() => !!this.videoUrl() && this.lyrics().length > 0);

  // Efficiently derive the current line
  currentLine = computed(() => {
    const time = this.currentTime();
    const lines = this.lyrics();

    // Reverse loop to find the most recent active line
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].time <= time) {
        return lines[i].text;
      }
    }
    return "♪";
  });

  // Calculate width dynamically
  cardWidth = computed(() => {
    return this.measureTextWidth(this.currentLine());
  });

  // --- DOM References ---
  // We need this to trigger .play() manually
  @ViewChild('videoRef') videoElement!: ElementRef<HTMLVideoElement>;

  private canvas: HTMLCanvasElement = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D | null = this.canvas.getContext('2d');

  constructor(private sanitizer: DomSanitizer) {
    // --- The Auto-Play Magic ---
    // effect() automatically runs whenever signals inside it change.
    effect(() => {
      if (this.isReady()) {
        // We are ready! Reset time to 0 to be safe.
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.currentTime = 0;
        }

        // Hold for 1 second (1000ms), then play
        setTimeout(() => {
          this.videoElement?.nativeElement.play().catch(err => {
            console.warn("Autoplay blocked:", err);
          });
        }, 1000);
      }
    });
  }

  ngAfterViewInit() {
    this.measureTextWidth(this.currentLine());
  }

  // 1. Handle Video
  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      const objectUrl = URL.createObjectURL(file);
      this.videoUrl.set(this.sanitizer.bypassSecurityTrustUrl(objectUrl));
    }
  }

  // 2. Handle Lyrics
  onLyricsSelected(event: Event): void {
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

  // 3. Sync Engine
  onTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.currentTime.set(video.currentTime);
  }

  private measureTextWidth(text: string): number {
    if (!this.ctx) return 600;
    this.ctx.font = "600 40px Inter, sans-serif";
    const metrics = this.ctx.measureText(text);
    return Math.ceil(metrics.width + 32 + 20);
  }
}
