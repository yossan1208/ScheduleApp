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
      // 何も表示しない（空行）
    } else if (list.length <= 2) {
      list.forEach(s => {
        const item = document.createElement('div');
        item.className   = 'week-schedule-item';
        item.textContent = s.title;
        schCol.appendChild(item);
      });
    } else {
      // 1件目を表示、2件目を "+N件" に
      const first = document.createElement('div');
      first.className   = 'week-schedule-item';
      first.textContent = list[0].title;
      schCol.appendChild(first);

      const more = document.createElement('div');
      more.className   = 'week-schedule-more';
      more.textContent = `+${list.length - 1}件`;
      schCol.appendChild(more);
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

// ─── スワイプ（方向判定・速度計算）──────────────────────

function attachSwipe(
  el: HTMLElement,
  onVertical: (deltaDays: number) => void,
  onRight: () => void,
): void {
  let startX    = 0;
  let startY    = 0;
  let startTime = 0;
  let tracking  = false;
  let mouseUpHandler: ((e: MouseEvent) => void) | null = null;

  function onStart(x: number, y: number): void {
    startX    = x;
    startY    = y;
    startTime = Date.now();
    tracking  = true;
  }

  function onEnd(x: number, y: number): void {
    if (!tracking) return;
    tracking = false;

    const dx  = x - startX;
    const dy  = y - startY;
    const dt  = Math.max(1, Date.now() - startTime); // avoid divide-by-zero
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy && absDx > 30) {
      // 水平スワイプ
      if (dx > 0) onRight(); // 右スワイプ → SCR-11へ戻る
      // 左スワイプは未定義（無視）
    } else if (absDy > absDx && absDy > 30) {
      // 縦スワイプ: 速度で日数を決める
      const velocity = absDy / dt; // px/ms
      const days     = Math.max(1, Math.min(MAX_DAYS, Math.round(velocity * 10)));
      onVertical(dy < 0 ? days : -days); // 上 → 未来、下 → 過去
    }
  }

  // タッチ
  el.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  el.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY));

  // マウス
  el.addEventListener('mousedown', e => {
    onStart(e.clientX, e.clientY);
    if (mouseUpHandler) window.removeEventListener('mouseup', mouseUpHandler);
    mouseUpHandler = (me: MouseEvent) => onEnd(me.clientX, me.clientY);
    window.addEventListener('mouseup', mouseUpHandler);
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
  attachSwipe(
    app.querySelector<HTMLElement>('.week-top')!,
    (deltaDays) => {
      startDate = addDays(startDate, deltaDays);
      window.history.replaceState(null, '', `/week?start=${startDate}`);
      fetchAndRender().catch(() => {});
    },
    () => history.back(),
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
