import './week.css';
import { schedules, type Schedule } from '../../api/schedules';
import { navigate } from '../../utils/router';

const DAYS_SHOWN   = 7;
const MAX_DAYS     = 14;
const DAY_NAMES_JA = ['日', '月', '火', '水', '木', '金', '土'];

// ─── ユーティリティ ────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateRangeArray(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

function getMonthLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getMonth() + 1}月`;
}

function isTodayInWindow(startDate: string, today: string): boolean {
  const end = addDays(startDate, DAYS_SHOWN - 1);
  return today >= startDate && today <= end;
}

// ─── DOM: 7行描画 ─────────────────────────────────────

function renderRows(
  body: HTMLElement,
  startDate: string,
  scheduleMap: Map<string, Schedule[]>,
  today: string,
): void {
  body.innerHTML = '';
  const dates = dateRangeArray(startDate, DAYS_SHOWN);

  dates.forEach(dateStr => {
    const d = new Date(`${dateStr}T00:00:00`);
    const dayName = DAY_NAMES_JA[d.getDay()];
    const dayNum  = String(d.getDate());
    const isToday = dateStr === today;
    const list    = scheduleMap.get(dateStr) ?? [];

    const row = document.createElement('div');
    row.className    = 'week-row';
    row.dataset.date = dateStr;

    // 日付列
    const dateCol = document.createElement('div');
    dateCol.className = 'week-date-col';

    const dayNameEl = document.createElement('span');
    dayNameEl.className   = 'week-day-name';
    dayNameEl.textContent = dayName;

    const dayNumEl = document.createElement('span');
    dayNumEl.className   = isToday ? 'week-day-num today' : 'week-day-num';
    dayNumEl.textContent = dayNum;

    dateCol.appendChild(dayNameEl);
    dateCol.appendChild(dayNumEl);

    // 予定列
    const schCol = document.createElement('div');
    schCol.className = 'week-schedules-col';

    if (list.length === 0) {
      // empty — nothing to add
    } else {
      const shown = list.slice(0, 2);
      shown.forEach(s => {
        const card = document.createElement('div');
        card.className = 'week-schedule-card';

        const bar = document.createElement('div');
        bar.className = 'week-schedule-card-bar';
        bar.style.backgroundColor = s.genre?.colorHex ?? '#9e9e9e';

        const title = document.createElement('div');
        title.className   = 'week-schedule-card-title';
        title.textContent = s.title;

        card.appendChild(bar);
        card.appendChild(title);
        schCol.appendChild(card);
      });

      if (list.length > 2) {
        const more = document.createElement('div');
        more.className   = 'week-schedule-more';
        more.textContent = `+${list.length - 2}件`;
        schCol.appendChild(more);
      }
    }

    row.appendChild(dateCol);
    row.appendChild(schCol);
    body.appendChild(row);
  });
}

// ─── Today ボタンの表示制御 ────────────────────────────

function updateTodayBtn(btn: HTMLElement, startDate: string, today: string): void {
  if (isTodayInWindow(startDate, today)) {
    btn.classList.add('hidden');
  } else {
    btn.classList.remove('hidden');
  }
}

// ─── 月ラベル更新 ──────────────────────────────────────

function updateMonthLabel(el: HTMLElement, startDate: string): void {
  el.textContent = getMonthLabel(startDate);
}

// ─── スクロール＋スワイプ（リアルタイム追従・スナップ）────

function attachScrollSwipe(
  el: HTMLElement,
  body: HTMLElement,
  onScroll: (deltaDays: number) => void,
  onRight: () => void,
): void {
  let startX              = 0;
  let startY              = 0;
  let tracking            = false;
  let directionDetermined = false;
  let isVertical          = false;
  let currentDy           = 0;
  let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  let mouseUpHandler:   ((e: MouseEvent) => void) | null = null;

  function rowHeight(): number {
    return body.offsetHeight / DAYS_SHOWN;
  }

  function onStart(x: number, y: number): void {
    startX              = x;
    startY              = y;
    tracking            = true;
    directionDetermined = false;
    isVertical          = false;
    currentDy           = 0;
    body.style.transition = '';
  }

  function onMove(x: number, y: number): void {
    if (!tracking) return;
    const dx    = x - startX;
    const dy    = y - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (!directionDetermined) {
      if (absDx > 8 || absDy > 8) {
        directionDetermined = true;
        isVertical = absDy >= absDx;
      }
      return;
    }

    if (!isVertical) return;

    // Clamp to ±MAX_DAYS rows
    const maxPx = MAX_DAYS * rowHeight();
    currentDy   = Math.max(-maxPx, Math.min(maxPx, dy));
    body.style.transform = `translateY(${currentDy}px)`;
  }

  function onEnd(x: number, _y: number): void {
    if (!tracking) return;
    tracking = false;

    const dx    = x - startX;
    const absDx = Math.abs(dx);

    if (!isVertical) {
      // Horizontal right swipe → go back
      if (absDx > 30 && dx > 0) onRight();
      body.style.transform = '';
      return;
    }

    // Snap to nearest row boundary
    const rh         = rowHeight();
    const days       = -Math.round(currentDy / rh); // up = negative dy = positive days (future)
    const clamped    = Math.max(-MAX_DAYS, Math.min(MAX_DAYS, days));

    // Animate snap back to 0
    body.style.transition = 'transform 0.18s ease';
    body.style.transform  = 'translateY(0)';

    setTimeout(() => {
      body.style.transition = '';
      if (clamped !== 0) {
        onScroll(clamped);
      }
    }, 180);
  }

  // Touch
  el.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  el.addEventListener('touchmove',  e => onMove(e.touches[0].clientX, e.touches[0].clientY),  { passive: true });
  el.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY));

  // Mouse
  el.addEventListener('mousedown', e => {
    onStart(e.clientX, e.clientY);

    if (mouseMoveHandler) window.removeEventListener('mousemove', mouseMoveHandler);
    if (mouseUpHandler)   window.removeEventListener('mouseup',   mouseUpHandler);

    mouseMoveHandler = (me: MouseEvent) => onMove(me.clientX, me.clientY);
    mouseUpHandler   = (me: MouseEvent) => {
      if (mouseMoveHandler) window.removeEventListener('mousemove', mouseMoveHandler);
      if (mouseUpHandler)   window.removeEventListener('mouseup',   mouseUpHandler);
      onEnd(me.clientX, me.clientY);
    };

    window.addEventListener('mousemove', mouseMoveHandler);
    window.addEventListener('mouseup',   mouseUpHandler);
  });
}

// ─── マウント ──────────────────────────────────────────

export function mount(app: HTMLElement): void {
  const today   = todayString();
  const params  = new URLSearchParams(location.search);
  let startDate = params.get('start') ?? today;

  // フェッチ中フラグ（競合防止）
  let fetchId = 0;

  app.innerHTML = `
    <div class="week-page">
      <div class="week-top">
        <div class="week-sidebar">
          <button class="week-gear-btn" id="btn-gear" aria-label="設定">⚙</button>
          <div class="week-month-label" id="week-month-label">${getMonthLabel(startDate)}</div>
        </div>
        <div class="week-body" id="week-body"></div>
      </div>
      <div class="week-footer">
        <button class="week-today-btn hidden" id="btn-today">Today</button>
        <button class="week-fab" id="btn-notes" aria-label="共有事項">!</button>
        <button class="week-fab" id="btn-add"   aria-label="予定追加">+</button>
      </div>
    </div>
  `;

  const body       = app.querySelector<HTMLElement>('#week-body')!;
  const monthLabel = app.querySelector<HTMLElement>('#week-month-label')!;
  const todayBtn   = app.querySelector<HTMLElement>('#btn-today')!;

  // ─── データ取得と描画 ──────────────────────────────
  async function fetchAndRender(): Promise<void> {
    const id  = ++fetchId;
    const end = addDays(startDate, DAYS_SHOWN - 1);

    const result = await schedules.getSchedules(startDate, end).catch(() => null);
    if (id !== fetchId) return; // 古いリクエストは無視

    const scheduleMap = new Map<string, Schedule[]>();
    if (result?.success && result.data) {
      result.data.forEach(s => {
        const arr = scheduleMap.get(s.date) ?? [];
        arr.push(s);
        scheduleMap.set(s.date, arr);
      });
      // 各日を開始時間でソート
      scheduleMap.forEach(arr =>
        arr.sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
      );
    }

    renderRows(body, startDate, scheduleMap, today);
    updateTodayBtn(todayBtn, startDate, today);
    updateMonthLabel(monthLabel, startDate);
  }

  // ─── スワイプ ──────────────────────────────────────
  attachScrollSwipe(
    app.querySelector<HTMLElement>('.week-top')!,
    body,
    (deltaDays) => {
      startDate = addDays(startDate, deltaDays);
      window.history.replaceState(null, '', `/week?start=${startDate}`);
      fetchAndRender().catch(() => {});
    },
    () => navigate('/home'),
  );

  // ─── 行タップ → SCR-20 ────────────────────────────
  body.addEventListener('click', e => {
    const row = (e.target as Element).closest<HTMLElement>('.week-row');
    if (!row?.dataset.date) return;
    navigate(`/day?date=${row.dataset.date}`);
  });

  // ─── ボタン ───────────────────────────────────────
  app.querySelector('#btn-gear')!
    .addEventListener('click', () => navigate('/settings'));

  todayBtn.addEventListener('click', () => {
    startDate = today;
    window.history.replaceState(null, '', `/week?start=${today}`);
    fetchAndRender().catch(() => {});
  });

  app.querySelector('#btn-notes')!
    .addEventListener('click', () => navigate('/notes'));

  app.querySelector('#btn-add')!
    .addEventListener('click', () => navigate('/schedule/new'));

  // ─── 初回描画 ─────────────────────────────────────
  fetchAndRender().catch(() => {});
}
