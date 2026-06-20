import './week.css';
import { schedules, type Schedule } from '../../api/schedules';
import { navigate } from '../../utils/router';

const DAYS_SHOWN   = 7;
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

// ─── DOM: 21行描画 ────────────────────────────────────

function renderRows(
  container: HTMLElement,
  startDate: string,
  scheduleMap: Map<string, Schedule[]>,
  today: string,
): void {
  container.innerHTML = '';
  // 21 dates: from startDate-7 to startDate+13
  const allDates = dateRangeArray(addDays(startDate, -DAYS_SHOWN), DAYS_SHOWN * 3);

  allDates.forEach(dateStr => {
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

    if (list.length > 0) {
      const cardsList = document.createElement('div');
      cardsList.className = 'week-cards-list';

      list.slice(0, 2).forEach(s => {
        const card = document.createElement('div');
        card.className = 'week-schedule-card';

        const bar = document.createElement('div');
        bar.className = 'week-schedule-card-bar';
        bar.style.backgroundColor = s.genre?.colorHex ?? '#9e9e9e';

        const body = document.createElement('div');
        body.className = 'week-schedule-card-body';

        const title = document.createElement('div');
        title.className   = 'week-schedule-card-title';
        title.textContent = s.title;

        const time = document.createElement('div');
        time.className   = 'week-schedule-card-time';
        time.textContent = s.startTime
          ? `${s.startTime.slice(0, 5)} ~ ${s.endTime?.slice(0, 5) ?? ''}`
          : '終日';

        body.appendChild(title);
        body.appendChild(time);
        card.appendChild(bar);
        card.appendChild(body);
        cardsList.appendChild(card);
      });

      schCol.appendChild(cardsList);

      if (list.length > 2) {
        const badge = document.createElement('div');
        badge.className   = 'week-count-badge';
        badge.textContent = `+${list.length - 2}件`;
        schCol.appendChild(badge);
      }
    }

    row.appendChild(dateCol);
    row.appendChild(schCol);
    container.appendChild(row);
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
  container: HTMLElement,
  onSnap: (deltaDays: number) => void,
  onRight: () => void,
): void {
  let startX        = 0;
  let startTouchY   = 0;
  let startTransY   = 0;
  let currentTransY = 0;
  let tracking      = false;
  let dirDetermined = false;
  let isVertical    = false;
  let mmh: ((e: MouseEvent) => void) | null = null;
  let muh: ((e: MouseEvent) => void) | null = null;

  function rh(): number { return body.offsetHeight / DAYS_SHOWN; }
  function minY(): number { return -2 * body.offsetHeight; }

  function readTransY(): number {
    const raw = window.getComputedStyle(container).transform;
    if (!raw || raw === 'none') return -body.offsetHeight;
    return new DOMMatrix(raw).m42;
  }

  function applyTransform(y: number): void {
    container.style.transform = `translateY(${y}px)`;
  }

  function onStart(x: number, y: number): void {
    startTransY   = readTransY();
    currentTransY = startTransY;
    container.style.transition = '';
    applyTransform(currentTransY);
    startX        = x;
    startTouchY   = y;
    tracking      = true;
    dirDetermined = false;
    isVertical    = false;
  }

  function onMove(x: number, y: number): void {
    if (!tracking) return;
    const dx    = x - startX;
    const dy    = y - startTouchY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (!dirDetermined) {
      if (absDx > 8 || absDy > 8) {
        dirDetermined = true;
        isVertical = absDy >= absDx;
      }
      return;
    }
    if (!isVertical) return;

    const newY = Math.max(minY(), Math.min(0, startTransY + dy));
    currentTransY = newY;
    applyTransform(newY);
  }

  function onEnd(x: number): void {
    if (!tracking) return;
    tracking = false;

    if (!isVertical) {
      if (Math.abs(x - startX) > 30 && x - startX > 0) onRight();
      return;
    }

    // Snap to nearest row boundary
    const rowH     = rh();
    const snapY    = Math.round(currentTransY / rowH) * rowH;
    const clampedY = Math.max(minY(), Math.min(0, snapY));

    container.style.transition = 'transform 0.18s ease';
    applyTransform(clampedY);

    setTimeout(() => {
      container.style.transition = '';
      // Calculate how many days shifted (positive = future, negative = past)
      const initialY  = -body.offsetHeight; // -7 * rowH
      const deltaDays = Math.round((initialY - clampedY) / rowH);

      // Reset to initial position silently (no transition)
      currentTransY = initialY;
      container.style.transition = 'none';
      applyTransform(initialY);
      // Force reflow so 'none' takes effect before we remove it
      void container.offsetHeight;
      container.style.transition = '';

      if (deltaDays !== 0) {
        onSnap(deltaDays);
      }
    }, 180);
  }

  // Touch
  el.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  el.addEventListener('touchmove',  e => onMove(e.touches[0].clientX, e.touches[0].clientY),  { passive: true });
  el.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientX));

  // Mouse
  el.addEventListener('mousedown', e => {
    onStart(e.clientX, e.clientY);
    if (mmh) window.removeEventListener('mousemove', mmh);
    if (muh) window.removeEventListener('mouseup',   muh);
    mmh = (me: MouseEvent) => onMove(me.clientX, me.clientY);
    muh = (me: MouseEvent) => {
      if (mmh) window.removeEventListener('mousemove', mmh);
      if (muh) window.removeEventListener('mouseup',   muh);
      onEnd(me.clientX);
    };
    window.addEventListener('mousemove', mmh);
    window.addEventListener('mouseup',   muh);
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
        <div class="week-body" id="week-body">
          <div class="week-rows-container" id="week-rows-container"></div>
        </div>
      </div>
      <div class="week-footer">
        <button class="nav-arrow-btn" id="btn-to-month" aria-label="月表示へ">←</button>
        <button class="week-today-btn hidden" id="btn-today">Today</button>
        <button class="fab" id="btn-notes" aria-label="共有事項">!</button>
        <button class="fab" id="btn-add"   aria-label="予定追加">+</button>
      </div>
    </div>
  `;

  const body          = app.querySelector<HTMLElement>('#week-body')!;
  const rowsContainer = app.querySelector<HTMLElement>('#week-rows-container')!;
  const monthLabel    = app.querySelector<HTMLElement>('#week-month-label')!;
  const todayBtn   = app.querySelector<HTMLElement>('#btn-today')!;

  // ─── データ取得と描画 ──────────────────────────────
  async function fetchAndRender(): Promise<void> {
    const id         = ++fetchId;
    const fetchStart = addDays(startDate, -DAYS_SHOWN);
    const fetchEnd   = addDays(startDate, DAYS_SHOWN * 2 - 1);

    const result = await schedules.getSchedules(fetchStart, fetchEnd).catch(() => null);
    if (id !== fetchId) return;

    const scheduleMap = new Map<string, Schedule[]>();
    if (result?.success && result.data) {
      result.data.forEach(s => {
        const arr = scheduleMap.get(s.date) ?? [];
        arr.push(s);
        scheduleMap.set(s.date, arr);
      });
      scheduleMap.forEach(arr =>
        arr.sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
      );
    }

    renderRows(rowsContainer, startDate, scheduleMap, today);
    updateTodayBtn(todayBtn, startDate, today);
    updateMonthLabel(monthLabel, startDate);
  }

  // ─── スワイプ ──────────────────────────────────────
  attachScrollSwipe(
    app.querySelector<HTMLElement>('.week-top')!,
    body,
    rowsContainer,
    (deltaDays: number) => {
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
  app.querySelector('#btn-to-month')!
    .addEventListener('click', () => navigate('/home'));

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
