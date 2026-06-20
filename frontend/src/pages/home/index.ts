import './home.css';
import { schedules, type Schedule } from '../../api/schedules';
import { buildCalendarGrid } from './calendar';
import { navigate } from '../../utils/router';

let currentYear      = 0;
let currentMonth     = 0;
let currentSchedules: Schedule[] = [];
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let didSwipe = false;
let mouseUpHandler: ((e: MouseEvent) => void) | null = null;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthLabel(year: number, month: number): string {
  return `${year}年${month + 1}月`;
}

async function refreshCalendar(
  wrapper: HTMLElement,
  label: HTMLElement,
): Promise<void> {
  wrapper.innerHTML = '<div class="calendar-loading">読み込み中…</div>';

  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
  const from    = `${currentYear}-${pad(currentMonth + 1)}-01`;
  const to      = `${currentYear}-${pad(currentMonth + 1)}-${pad(lastDay)}`;

  const result = await schedules.getSchedules(from, to);

  if (!result.success || !result.data) {
    wrapper.innerHTML = '<div class="calendar-error">予定を取得できませんでした</div>';
    return;
  }

  currentSchedules  = result.data;
  label.textContent = monthLabel(currentYear, currentMonth);

  const grid = buildCalendarGrid(currentYear, currentMonth, currentSchedules);
  wrapper.innerHTML = '';
  wrapper.appendChild(grid);
}

function attachSwipe(wrapper: HTMLElement, label: HTMLElement): void {
  let startX     = 0;
  let startY     = 0;
  let isDragging = false;

  function onStart(x: number, y: number): void {
    startX     = x;
    startY     = y;
    isDragging = true;
    wrapper.classList.add('grabbing');
  }

  function onEnd(x: number, y: number): void {
    if (!isDragging) return;
    isDragging = false;
    wrapper.classList.remove('grabbing');

    const dx    = x - startX;
    const dy    = y - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // 水平スワイプ（右）→ SCR-12（年ビュー）へ
    if (absDx > absDy && absDx > 50 && dx > 0) {
      didSwipe = true;
      navigate(`/year?year=${currentYear}`);
      return;
    }

    // 水平スワイプ（左）→ SCR-10（週ビュー）へ
    if (absDx > absDy && absDx > 50 && dx < 0) {
      didSwipe = true;
      navigate(`/week?start=${todayStr()}`);
      return;
    }

    // 縦スワイプ → 月を変える（既存ロジック）
    if (Math.abs(dy) < 50) return;

    didSwipe = true;

    // スライドアウトアニメーション
    const grid = wrapper.querySelector<HTMLElement>('.calendar-grid');
    if (grid) {
      grid.style.transform = `translateY(${dy < 0 ? '-40px' : '40px'})`;
      grid.style.opacity   = '0';
    }

    if (dy < 0) {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    } else {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    }

    if (refreshTimer !== null) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(
      () => refreshCalendar(wrapper, label).catch(() => {}),
      150,
    );
  }

  // タッチ
  wrapper.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  wrapper.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY));

  // マウス（window に登録し、前回分を削除してからセット）
  if (mouseUpHandler !== null) {
    window.removeEventListener('mouseup', mouseUpHandler);
  }
  mouseUpHandler = (e: MouseEvent) => { if (isDragging) onEnd(e.clientX, e.clientY); };
  wrapper.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
  window.addEventListener('mouseup', mouseUpHandler);
}

function attachCellClick(wrapper: HTMLElement): void {
  wrapper.addEventListener('click', (e) => {
    if (didSwipe) { didSwipe = false; return; }
    const cell = (e.target as Element).closest<HTMLElement>('.calendar-cell');
    if (!cell?.dataset.date) return;
    navigate(`/day?date=${cell.dataset.date}`);
  });
}

export function mount(app: HTMLElement): void {
  const monthParam = new URLSearchParams(location.search).get('month');
  if (monthParam) {
    const [y, m] = monthParam.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && y >= 1900 && y <= 2200 && m >= 1 && m <= 12) {
      currentYear  = y;
      currentMonth = m - 1;
    } else {
      const now    = new Date();
      currentYear  = now.getFullYear();
      currentMonth = now.getMonth();
    }
  } else {
    const now    = new Date();
    currentYear  = now.getFullYear();
    currentMonth = now.getMonth();
  }

  app.innerHTML = `
    <div class="home-page">
      <div class="home-header">
        <h2 class="month-label" id="month-label">${monthLabel(currentYear, currentMonth)}</h2>
        <button class="icon-btn" id="btn-settings" aria-label="設定">⚙</button>
      </div>
      <div class="calendar-wrapper" id="calendar-wrapper"></div>
      <div class="view-tab-bar">
        <button class="tab-btn" id="btn-year-tab">Y</button>
        <button class="tab-btn active">M</button>
        <button class="tab-btn" id="btn-week-tab">W</button>
      </div>
      <div class="fab-group">
        <button class="fab" id="btn-notes" aria-label="共有事項">!</button>
        <button class="fab" id="btn-new-schedule" aria-label="予定追加">+</button>
      </div>
    </div>
  `;

  const wrapper = app.querySelector<HTMLElement>('#calendar-wrapper')!;
  const label   = app.querySelector<HTMLElement>('#month-label')!;

  attachSwipe(wrapper, label);
  attachCellClick(wrapper);

  app.querySelector<HTMLElement>('#btn-week-tab')!
    .addEventListener('click', () => navigate(`/week?start=${todayStr()}`));
  app.querySelector<HTMLElement>('#btn-year-tab')!
    .addEventListener('click', () => navigate(`/year?year=${currentYear}`));
  app.querySelector<HTMLElement>('#btn-settings')!
    .addEventListener('click', () => navigate('/settings'));
  app.querySelector<HTMLElement>('#btn-notes')!
    .addEventListener('click', () => navigate('/notes'));
  app.querySelector<HTMLElement>('#btn-new-schedule')!
    .addEventListener('click', () => navigate('/schedule/new'));

  refreshCalendar(wrapper, label).catch(() => {});
}
