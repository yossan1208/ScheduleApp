import './day.css';
import { schedules, type Schedule } from '../../api/schedules';
import { navigate } from '../../utils/router';

// ─── 定数 ─────────────────────────────────────────────
const VIEW_MODE_KEY = 'scr20_view_mode';
const HOUR_HEIGHT   = 60; // px per hour
const DAY_NAMES_JA  = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

type ViewMode = 'list' | 'timeline';

// ─── ユーティリティ ────────────────────────────────────
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  return `${parseInt(h, 10)}:${m}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function headerText(dateStr: string): { name: string; date: string } {
  const d = new Date(`${dateStr}T00:00:00`);
  return {
    name: DAY_NAMES_JA[d.getDay()],
    date: `${d.getMonth() + 1}月 ${d.getDate()}日`,
  };
}

// ─── 描画: リストビュー ────────────────────────────────
function renderList(area: HTMLElement, list: Schedule[]): void {
  area.innerHTML = '';
  if (list.length === 0) {
    area.innerHTML = '<div class="day-empty">予定なし</div>';
    return;
  }

  list.forEach(s => {
    const card = document.createElement('div');
    card.className   = 'day-card';
    card.dataset.id  = String(s.id);

    const bar = document.createElement('div');
    bar.className = 'day-card-genre-bar';
    bar.style.backgroundColor = s.genre?.colorHex ?? '#9e9e9e';

    const body = document.createElement('div');
    body.className = 'day-card-body';
    body.innerHTML = `
      <div class="day-card-title">${s.title}</div>
      <div class="day-card-time">${formatTime(s.startTime)} - ${formatTime(s.endTime)}</div>
    `;

    card.appendChild(bar);
    card.appendChild(body);
    area.appendChild(card);
  });
}

// ─── 描画: タイムラインビュー ─────────────────────────
function renderTimeline(area: HTMLElement, list: Schedule[]): void {
  area.innerHTML = '';

  if (list.length === 0) {
    area.innerHTML = '<div class="day-empty">予定なし</div>';
    return;
  }

  const container = document.createElement('div');
  container.className = 'day-timeline';

  // 時間軸行（0〜23）
  for (let h = 0; h < 24; h++) {
    const row = document.createElement('div');
    row.className = 'day-timeline-row';
    row.style.top = `${h * HOUR_HEIGHT}px`;

    const hourEl = document.createElement('span');
    hourEl.className   = 'day-timeline-hour';
    hourEl.textContent = String(h);

    const line = document.createElement('div');
    line.className = 'day-timeline-line';

    row.appendChild(hourEl);
    row.appendChild(line);
    container.appendChild(row);
  }

  // 予定ブロック
  list.forEach(s => {
    if (!s.startTime || !s.endTime) return;

    const startMin = timeToMinutes(s.startTime);
    const endMin   = timeToMinutes(s.endTime);
    const top      = (startMin / 60) * HOUR_HEIGHT;
    const height   = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);

    const block = document.createElement('div');
    block.className  = 'day-event-block';
    block.dataset.id = String(s.id);
    block.style.top    = `${top}px`;
    block.style.height = `${height}px`;

    const genreBar = document.createElement('div');
    genreBar.className = 'day-event-genre-bar';
    genreBar.style.backgroundColor = s.genre?.colorHex ?? '#9e9e9e';

    const bodyEl = document.createElement('div');
    bodyEl.className = 'day-event-body';
    bodyEl.innerHTML = `
      <div class="day-event-title">${s.title}</div>
      <div class="day-event-time">${formatTime(s.startTime)} - ${formatTime(s.endTime)}</div>
    `;

    block.appendChild(genreBar);
    block.appendChild(bodyEl);
    container.appendChild(block);
  });

  area.appendChild(container);

  // 自動スクロール位置
  const earliest = list
    .filter(s => s.startTime)
    .map(s => timeToMinutes(s.startTime!))
    .reduce((min, m) => Math.min(min, m), list.length > 0 ? Infinity : 9 * 60);

  const scrollTo = earliest === Infinity ? 9 * 60 : earliest;
  // 少し上に余白を持たせて表示
  area.scrollTop = Math.max(0, (scrollTo / 60) * HOUR_HEIGHT - 40);
}

// ─── スワイプ（左右）─────────────────────────────────
let didSwipe = false;
let mouseUpHandler: ((e: MouseEvent) => void) | null = null;

function attachSwipe(
  el: HTMLElement,
  currentDate: string,
  onSwipe: (newDate: string) => void,
): void {
  let startX     = 0;
  let isDragging = false;

  function onStart(x: number): void {
    startX     = x;
    isDragging = true;
  }

  function onEnd(x: number): void {
    if (!isDragging) return;
    isDragging = false;

    const delta = x - startX;
    if (Math.abs(delta) < 50) return;

    didSwipe = true;
    onSwipe(addDays(currentDate, delta < 0 ? 1 : -1));
  }

  el.addEventListener('touchstart', e => onStart(e.touches[0].clientX), { passive: true });
  el.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientX));

  if (mouseUpHandler !== null) window.removeEventListener('mouseup', mouseUpHandler);
  mouseUpHandler = (e: MouseEvent) => { if (isDragging) onEnd(e.clientX); };
  el.addEventListener('mousedown', e => onStart(e.clientX));
  window.addEventListener('mouseup', mouseUpHandler);
}

// ─── マウント ──────────────────────────────────────────
export function mount(app: HTMLElement): void {
  const dateStr = new URLSearchParams(location.search).get('date') ?? '';
  if (!dateStr) { navigate('/home'); return; }

  const { name, date } = headerText(dateStr);
  const savedMode = (localStorage.getItem(VIEW_MODE_KEY) ?? 'list') as ViewMode;

  app.innerHTML = `
    <div class="day-page" id="day-page">
      <div class="day-header">
        <div class="day-name">${name}</div>
        <div class="day-date">${date}</div>
      </div>
      <div class="day-content">
        <div class="day-section-label">Schedule</div>
        <div class="day-schedule-area" id="day-schedule-area">
          <div class="day-empty">読み込み中…</div>
        </div>
      </div>
      <div class="day-footer">
        <button class="day-footer-btn" id="btn-back" aria-label="戻る">←</button>
        <div class="day-toggle-wrap">
          <button class="day-toggle" id="btn-toggle" data-mode="${savedMode}" aria-label="表示切替">
            <div class="day-toggle-thumb">🕐</div>
          </button>
        </div>
        <button class="day-footer-btn" id="btn-add" aria-label="予定追加">+</button>
      </div>
    </div>
  `;

  const area   = app.querySelector<HTMLElement>('#day-schedule-area')!;
  const toggle = app.querySelector<HTMLElement>('#btn-toggle')!;
  const page   = app.querySelector<HTMLElement>('#day-page')!;

  let currentMode: ViewMode = savedMode;
  let currentSchedules: Schedule[] = [];

  // 描画
  function render(): void {
    if (currentMode === 'list') {
      renderList(area, currentSchedules);
    } else {
      renderTimeline(area, currentSchedules);
    }
  }

  // フェッチ
  schedules.getSchedules(dateStr, dateStr).then(result => {
    if (!result.success || !result.data) {
      area.innerHTML = '<div class="day-empty">予定を取得できませんでした</div>';
      return;
    }
    currentSchedules = result.data.sort((a, b) => {
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });
    render();
  });

  // 予定タップ → SCR-23
  area.addEventListener('click', e => {
    if (didSwipe) { didSwipe = false; return; }
    const card = (e.target as Element).closest<HTMLElement>('[data-id]');
    if (!card?.dataset.id) return;
    navigate(`/schedule/${card.dataset.id}`);
  });

  // 表示切替トグル
  toggle.addEventListener('click', () => {
    currentMode = currentMode === 'list' ? 'timeline' : 'list';
    toggle.dataset.mode = currentMode;
    localStorage.setItem(VIEW_MODE_KEY, currentMode);
    render();
  });

  // ← 戻る
  app.querySelector('#btn-back')!
    .addEventListener('click', () => history.back());

  // ＋ 予定追加 → SCR-21
  app.querySelector('#btn-add')!
    .addEventListener('click', () => navigate(`/schedule/new?date=${dateStr}`));

  // 左右スワイプ
  attachSwipe(page, dateStr, newDate => navigate(`/day?date=${newDate}`));
}
