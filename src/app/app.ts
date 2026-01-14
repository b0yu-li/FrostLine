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
import {animate, style, transition, trigger} from '@angular/animations';
import {LyricLine} from './models/lyric.model';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,

  animations: [
    trigger('lyricChange', [
      // INCOMING TEXT (void => *)
      transition('void => *', [
        style({
          opacity: 0,
          filter: 'blur(12px)',
        }),
        animate('900ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({
          opacity: 1,
          filter: 'blur(0)',
        }))
      ]),
      // OUTGOING TEXT (* => void)
      transition('* => void', [
        style({
          opacity: 1,
          filter: 'blur(0)'
        }),
        animate('900ms ease-out', style({
          opacity: 0,
          filter: 'blur(12px)'
        }))
      ])
    ])
  ]
})
export class App implements AfterViewInit {
  readonly PADDING_PX = 32;
  readonly BUFFER_PX = 20;

  videoUrl: WritableSignal<SafeUrl | null> = signal(null);
  lyrics: WritableSignal<LyricLine[]> = signal([]);
  jsonFileName: WritableSignal<string | null> = signal(null);
  currentTime: WritableSignal<number> = signal(0);

  isReady = computed(() => !!this.videoUrl() && this.lyrics().length > 0);

  currentLine = computed(() => {
    const time = this.currentTime();
    const lines = this.lyrics();
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].time <= time) {
        return lines[i].text;
      }
    }
    return "♪";
  });

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
          this.videoElement?.nativeElement.play().catch(err => console.warn(err));
        }, 1000);
      }
    });
  }

  ngAfterViewInit() {
    this.measureTextWidth(this.currentLine());
  }

  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      const objectUrl = URL.createObjectURL(file);
      this.videoUrl.set(this.sanitizer.bypassSecurityTrustUrl(objectUrl));
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
        } catch (err) {
          alert('Invalid JSON');
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
    this.ctx.font = "600 40px Inter, sans-serif";
    const metrics = this.ctx.measureText(text);
    return Math.ceil(metrics.width + this.PADDING_PX + this.BUFFER_PX);
  }
}
