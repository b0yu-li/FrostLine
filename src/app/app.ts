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
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { animate, style, transition, trigger } from '@angular/animations';
import { LyricLine } from './models/lyric.model';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,

  animations: [
    trigger('lyricChange', [
      transition('void => *', [
        style({ opacity: 0, filter: 'blur(12px)' }),
        animate('900ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({ opacity: 1, filter: 'blur(0)' }))
      ]),
      transition('* => void', [
        style({ opacity: 1, filter: 'blur(0)' }),
        animate('900ms ease-out', style({ opacity: 0, filter: 'blur(12px)' }))
      ])
    ])
  ]
})
export class App implements AfterViewInit {
  readonly PADDING_PX = 22;
  readonly BUFFER_PX = 20;

  // --- State Signals ---
  videoUrl: WritableSignal<SafeUrl | null> = signal(null);
  lyrics: WritableSignal<LyricLine[]> = signal([]);
  jsonFileName: WritableSignal<string | null> = signal(null);

  // Playback State
  currentTime: WritableSignal<number> = signal(0);
  duration: WritableSignal<number> = signal(0);
  isPlaying: WritableSignal<boolean> = signal(false);

  // Computed
  isReady = computed(() => !!this.videoUrl() && this.lyrics().length > 0);

  currentLine = computed(() => {
    const time = this.currentTime();
    const lines = this.lyrics();
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].time <= time) { return lines[i].text; }
    }
    return "♪";
  });

  cardWidth = computed(() => this.measureTextWidth(this.currentLine()));

  @ViewChild('videoRef') videoElement!: ElementRef<HTMLVideoElement>;
  private canvas: HTMLCanvasElement = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D | null = this.canvas.getContext('2d');

  constructor(private sanitizer: DomSanitizer) {}

  ngAfterViewInit() {
    this.measureTextWidth(this.currentLine());
  }

  // --- Playback Controls ---

  togglePlay() {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    if (video.paused) {
      video.play();
      this.isPlaying.set(true);
    } else {
      video.pause();
      this.isPlaying.set(false);
    }
  }

  seek(event: Event) {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    const value = (event.target as HTMLInputElement).value;
    video.currentTime = Number(value);
    this.currentTime.set(Number(value));
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // --- Events ---

  onMetadataLoaded(event: Event) {
    const video = event.target as HTMLVideoElement;
    this.duration.set(video.duration);
  }

  onTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.currentTime.set(video.currentTime);
  }

  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      const objectUrl = URL.createObjectURL(file);
      this.videoUrl.set(this.sanitizer.bypassSecurityTrustUrl(objectUrl));
      this.isPlaying.set(false); // Reset state
    }
  }

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
        } catch (err) { alert('Invalid JSON'); }
      };
      reader.readAsText(file);
    }
  }

  private measureTextWidth(text: string): number {
    if (!this.ctx) return 600;
    this.ctx.font = "oblique 700 36px Helvetica, Inter, sans-serif";
    const metrics = this.ctx.measureText(text);
    return Math.ceil(metrics.width + this.PADDING_PX + this.BUFFER_PX);
  }
}
