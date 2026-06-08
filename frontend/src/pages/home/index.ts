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
  let startY     = 0;
  let isDragging = false;

  function onStart(y: number): void {
    startY     = y;
    isDragging = true;
    wrapper.classList.add('grabbing');
  }

  function onEnd(y: number): void {
    if (!isDragging) return;
    isDragging = false;
    wrapper.classList.remove('grabbing');

    const delta = y - startY;
    if (Math.abs(delta) < 50) return;

    didSwipe = true;

    // スライドアウトアニメーション
    const grid = wrapper.querySelector<HTMLElement>('.calendar-grid');
    if (grid) {
      grid.style.transform = `translateY(${delta < 0 ? '-40px' : '40px'})`;
      grid.style.opacity   = '0';
    }

    if (delta < 0) {
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
  wrapper.addEventListener('touchstart', e => onStart(e.touches[0].clientY), { passive: true });
  wrapper.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientY));

  // マウス（window に登録し、前回分を削除してからセット）
  if (mouseUpHandler !== null) {
    window.removeEventListener('mouseup', mouseUpHandler);
  }
  mouseUpHandler = (e: MouseEvent) => { if (isDragging) onEnd(e.clientY); };
  wrapper.addEventListener('mousedown', e => onStart(e.clientY));
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
  const now    = new Date();
  currentYear  = now.getFullYear();
  currentMonth = now.getMonth();

  app.innerHTML = `
    <div class="home-page">
      <div class="home-header">
        <button class="icon-btn" id="btn-settings" aria-label="設定">⚙</button>
        <h2 class="month-label" id="month-label">${monthLabel(currentYear, currentMonth)}</h2>
      </div>
      <div class="calendar-wrapper" id="calendar-wrapper"></div>
      <div class="view-tab-bar">
        <button class="tab-btn" disabled>Y</button>
        <button class="tab-btn active">M</button>
        <button class="tab-btn" disabled>W</button>
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

  app.querySelector<HTMLElement>('#btn-settings')!
    .addEventListener('click', () => navigate('/settings'));
  app.querySelector<HTMLElement>('#btn-notes')!
    .addEventListener('click', () => navigate('/notes'));
  app.querySelector<HTMLElement>('#btn-new-schedule')!
    .addEventListener('click', () => navigate('/schedule/new'));

  refreshCalendar(wrapper, label).catch(() => {});
}
