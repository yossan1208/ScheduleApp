import './year.css';
import { navigate } from '../../utils/router';
import { months, daysShort } from '../../utils/i18n';

// ─── ユーティリティ ────────────────────────────────────
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0 = Sun
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// ─── ミニカレンダーカード生成 ──────────────────────────
function buildMonthCard(year: number, month: number, today: string): HTMLElement {
  const card = document.createElement('div');
  card.className = 'year-month-card';

  // 月名
  const name = document.createElement('div');
  name.className   = 'year-month-name';
  name.textContent = months()[month];
  card.appendChild(name);

  // 曜日ヘッダー
  const dowRow = document.createElement('div');
  dowRow.className = 'year-dow-row';
  daysShort().forEach((label, i) => {
    const cell = document.createElement('span');
    cell.className   = `year-dow-cell${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}`;
    cell.textContent = label;
    dowRow.appendChild(cell);
  });
  card.appendChild(dowRow);

  // 日付グリッド
  const grid = document.createElement('div');
  grid.className = 'year-date-grid';

  const firstDay = firstDayOfWeek(year, month);
  const total    = daysInMonth(year, month);

  // 空セル（月の最初の曜日まで）
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('span');
    empty.className   = 'year-date-cell empty';
    empty.textContent = '';
    grid.appendChild(empty);
  }

  // 日付セル
  for (let d = 1; d <= total; d++) {
    const dateStr = `${year}-${pad2(month + 1)}-${pad2(d)}`;
    const cell    = document.createElement('span');
    cell.className   = 'year-date-cell';
    cell.textContent = String(d);
    if (dateStr === today) cell.classList.add('today');
    grid.appendChild(cell);
  }

  card.appendChild(grid);
  return card;
}

// ─── 年グリッドを再描画 ───────────────────────────────
function renderYear(
  grid: HTMLElement,
  header: HTMLElement,
  year: number,
  onMonthTap: (month: number) => void,
): void {
  const today = todayStr();
  header.textContent = String(year);
  grid.innerHTML = '';

  for (let m = 0; m < 12; m++) {
    const card = buildMonthCard(year, m, today);
    card.addEventListener('click', () => onMonthTap(m));
    grid.appendChild(card);
  }
}

// ─── マウント ──────────────────────────────────────────
let mouseUpHandler: ((e: MouseEvent) => void) | null = null;

export function mount(app: HTMLElement): void {
  const params = new URLSearchParams(location.search);
  let currentYear = parseInt(params.get('year') ?? '', 10);
  if (isNaN(currentYear)) currentYear = new Date().getFullYear();

  app.innerHTML = `
    <div class="year-page" id="year-page">
      <div class="year-header" id="year-header">${currentYear}</div>
      <div class="year-grid"   id="year-grid"></div>
      <button class="nav-arrow-btn year-nav-btn" id="btn-to-home" aria-label="ホームへ戻る">←</button>
    </div>
  `;

  const page   = app.querySelector<HTMLElement>('#year-page')!;
  const grid   = app.querySelector<HTMLElement>('#year-grid')!;
  const header = app.querySelector<HTMLElement>('#year-header')!;

  function onMonthTap(month: number): void {
    navigate(`/home?month=${currentYear}-${pad2(month + 1)}`);
  }

  renderYear(grid, header, currentYear, onMonthTap);

  // → ボタン → /home
  app.querySelector('#btn-to-home')!
    .addEventListener('click', () => navigate('/home'));

  // ─── スワイプジェスチャー ───────────────────────────
  let startX = 0;
  let startY = 0;
  let isDragging = false;

  function onStart(x: number, y: number): void {
    startX = x; startY = y; isDragging = true;
  }

  function onEnd(x: number, y: number): void {
    if (!isDragging) return;
    isDragging = false;

    const dx    = x - startX;
    const dy    = y - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // 左スワイプ → /home
    if (absDx > absDy && absDx > 50 && dx < 0) {
      navigate('/home');
      return;
    }

    // 上下スワイプ → 年切り替え（replaceState でヒストリーを汚さない）
    if (absDy > absDx && absDy > 50) {
      currentYear += dy < 0 ? 1 : -1;
      window.history.replaceState(null, '', `/year?year=${currentYear}`);
      renderYear(grid, header, currentYear, onMonthTap);
    }
  }

  page.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  page.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY));

  if (mouseUpHandler !== null) window.removeEventListener('mouseup', mouseUpHandler);
  mouseUpHandler = (e: MouseEvent) => { if (isDragging) onEnd(e.clientX, e.clientY); };
  page.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
  window.addEventListener('mouseup', mouseUpHandler);
}
