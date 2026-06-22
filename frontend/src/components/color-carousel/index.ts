import './color-carousel.css';

export interface CarouselColor {
  colorId: number;
  hexCode: string;
  displayName: string;
  disabled?: boolean;
}

export interface ColorCarouselOptions {
  container: HTMLElement;
  colors: CarouselColor[];
  selectedColorId: number | null;
  onChange: (colorId: number) => void;
}

function safeHex(hex: string): string {
  return /^#[0-9a-fA-F]{3,6}$/.test(hex) ? hex : '#ccc';
}

export class ColorCarousel {
  private colors: CarouselColor[];
  private selectedIndex: number;
  private onChange: (colorId: number) => void;
  private container: HTMLElement;

  private carouselEl: HTMLElement | null = null;
  private trackEl: HTMLElement | null = null;

  // Event handler references for cleanup
  private handlePrevClick: () => void;
  private handleNextClick: () => void;
  private handleTrackClick: (e: MouseEvent) => void;
  private handleTouchStart: (e: TouchEvent) => void;
  private handleTouchEnd: (e: TouchEvent) => void;

  private touchStartX = 0;

  constructor(options: ColorCarouselOptions) {
    this.colors = options.colors;
    this.onChange = options.onChange;
    this.container = options.container;

    // Determine initial selectedIndex
    this.selectedIndex = this.resolveIndex(options.selectedColorId);

    // Bind handlers
    this.handlePrevClick = () => this.goTo('prev');
    this.handleNextClick = () => this.goTo('next');
    this.handleTrackClick = (e: MouseEvent) => this.onTrackClick(e);
    this.handleTouchStart = (e: TouchEvent) => {
      this.touchStartX = e.changedTouches[0].clientX;
    };
    this.handleTouchEnd = (e: TouchEvent) => {
      const delta = e.changedTouches[0].clientX - this.touchStartX;
      if (Math.abs(delta) > 40) {
        this.goTo(delta < 0 ? 'next' : 'prev');
      }
    };

    this.mount();
  }

  private resolveIndex(colorId: number | null): number {
    if (this.colors.length === 0) return 0;

    // Try to find the requested color
    let startIdx = 0;
    if (colorId !== null) {
      const found = this.colors.findIndex((c) => c.colorId === colorId);
      if (found !== -1) startIdx = found;
    }

    // If it's not disabled, use it
    if (!this.colors[startIdx].disabled) return startIdx;

    // Otherwise find the first non-disabled color (forward search)
    for (let i = 0; i < this.colors.length; i++) {
      const idx = (startIdx + i) % this.colors.length;
      if (!this.colors[idx].disabled) return idx;
    }

    // All colors are disabled — stay at startIdx
    return startIdx;
  }

  private mount(): void {
    // Build the carousel HTML
    const carousel = document.createElement('div');
    carousel.className = 'color-carousel';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'carousel-btn carousel-btn--prev';
    prevBtn.setAttribute('aria-label', '前の色');
    prevBtn.textContent = '‹';

    const track = document.createElement('div');
    track.className = 'carousel-track';

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'carousel-btn carousel-btn--next';
    nextBtn.setAttribute('aria-label', '次の色');
    nextBtn.textContent = '›';

    carousel.appendChild(prevBtn);
    carousel.appendChild(track);
    carousel.appendChild(nextBtn);

    this.carouselEl = carousel;
    this.trackEl = track;

    // Attach event listeners
    prevBtn.addEventListener('click', this.handlePrevClick);
    nextBtn.addEventListener('click', this.handleNextClick);
    track.addEventListener('click', this.handleTrackClick);
    carousel.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    carousel.addEventListener('touchend', this.handleTouchEnd, { passive: true });

    this.container.appendChild(carousel);
    this.render();
  }

  private render(): void {
    if (!this.trackEl || this.colors.length === 0) return;

    this.trackEl.innerHTML = '';

    // 5 positions: idx-2, idx-1, idx, idx+1, idx+2
    const len = this.colors.length;
    for (let pos = 0; pos < 5; pos++) {
      const colorIdx = ((this.selectedIndex - 2 + pos) % len + len) % len;
      const color = this.colors[colorIdx];

      const item = document.createElement('div');
      item.className = `carousel-item carousel-item--pos-${pos}`;
      item.dataset.colorId = String(color.colorId);
      item.dataset.pos = String(pos);
      if (color.disabled) {
        item.classList.add('carousel-item--disabled');
      }

      const swatch = document.createElement('div');
      swatch.className = 'carousel-swatch';
      swatch.style.backgroundColor = safeHex(color.hexCode);

      item.appendChild(swatch);
      this.trackEl.appendChild(item);
    }
  }

  private onTrackClick(e: MouseEvent): void {
    const item = (e.target as HTMLElement).closest<HTMLElement>('.carousel-item');
    if (!item) return;
    const pos = parseInt(item.dataset.pos ?? '', 10);
    if (isNaN(pos)) return;

    // pos 2 is center — no navigation needed (already selected)
    if (pos < 2) {
      // clicked left of center: go prev (pos 2-pos) times
      const steps = 2 - pos;
      for (let i = 0; i < steps; i++) this.goTo('prev');
    } else if (pos > 2) {
      // clicked right of center: go next (pos-2) times
      const steps = pos - 2;
      for (let i = 0; i < steps; i++) this.goTo('next');
    }
  }

  private goTo(direction: 'prev' | 'next'): void {
    if (this.colors.length === 0) return;

    const len = this.colors.length;
    const step = direction === 'prev' ? -1 : 1;

    // Advance at least once, skip disabled colors
    let next = (this.selectedIndex + step + len) % len;
    let iterations = 0;

    while (this.colors[next].disabled) {
      next = (next + step + len) % len;
      iterations++;
      // If we've looped through all colors, all are disabled — abort
      if (iterations >= len) return;
    }

    this.selectedIndex = next;
    this.render();
    this.onChange(this.colors[this.selectedIndex].colorId);
  }

  // Public API

  destroy(): void {
    if (this.carouselEl) {
      const prevBtn = this.carouselEl.querySelector<HTMLButtonElement>('.carousel-btn--prev');
      const nextBtn = this.carouselEl.querySelector<HTMLButtonElement>('.carousel-btn--next');

      prevBtn?.removeEventListener('click', this.handlePrevClick);
      nextBtn?.removeEventListener('click', this.handleNextClick);
      this.trackEl?.removeEventListener('click', this.handleTrackClick);
      this.carouselEl.removeEventListener('touchstart', this.handleTouchStart);
      this.carouselEl.removeEventListener('touchend', this.handleTouchEnd);
    }
    this.container.innerHTML = '';
    this.carouselEl = null;
    this.trackEl = null;
  }

  setSelected(colorId: number): void {
    const idx = this.colors.findIndex((c) => c.colorId === colorId);
    if (idx === -1) return;
    if (this.colors[idx].disabled) return;
    this.selectedIndex = idx;
    this.render();
  }

  getSelectedId(): number | null {
    if (this.colors.length === 0) return null;
    const color = this.colors[this.selectedIndex];
    return color.disabled ? null : color.colorId;
  }
}
