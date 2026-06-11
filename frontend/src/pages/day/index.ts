import './day.css';
import { schedules, type Schedule } from '../../api/schedules';
import { navigate } from '../../utils/router';

// ─── 定数 ─────────────────────────────────────────────
const VIEW_MODE_KEY = 'scr20_view_mode';
const HOUR_HEIGHT   = 60; // px per hour
const DAY_NAMES_JA  = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
const DELETE_PX     = 64;

type ViewMode = 'list' | 'timeline';

// ─── モジュール変数 ────────────────────────────────────
let didSwipe      = false;
let mouseUpHandler: ((e: MouseEvent) => void) | null = null;
let openCard: HTMLElement | null = null;

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

// ─── カードスワイプ: 開いているカードを閉じる ─────────
function closeOpenCard(): void {
  if (!openCard) return;
  openCard.style.transform = 'translateX(0)';
  openCard = null;
}

// ─── カードスワイプ: Apple Music スタイル ────────────
function attachCardSwipe(
  card: HTMLElement,
  deleteBtn: HTMLButtonElement,
  onDelete: () => void,
): void {
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let isOpen = false;
  let cardMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  let cardMouseUpHandler: ((e: MouseEvent) => void) | null = null;

  function openCard_(): void {
    closeOpenCard();
    card.style.transform = `translateX(-${DELETE_PX}px)`;
    openCard = card;
    isOpen = true;
  }

  function closeCard(): void {
    card.style.transform = 'translateX(0)';
    if (openCard === card) openCard = null;
    isOpen = false;
  }

  // Touch
  card.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  card.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dy) > Math.abs(dx)) { tracking = false; return; }
    const base = isOpen ? -DELETE_PX : 0;
    const clamped = Math.min(0, Math.max(-DELETE_PX, base + dx));
    card.style.transform = `translateX(${clamped}px)`;
  }, { passive: true });

  card.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - startX;
    if (!isOpen && dx < -40) { openCard_(); return; }
    closeCard();
  });

  // Mouse (must implement both touch and mouse)
  card.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    startX = e.clientX;
    startY = e.clientY;
    tracking = true;

    if (cardMouseMoveHandler) window.removeEventListener('mousemove', cardMouseMoveHandler);
    if (cardMouseUpHandler) window.removeEventListener('mouseup', cardMouseUpHandler);

    cardMouseMoveHandler = (me: MouseEvent) => {
      if (!tracking) return;
      const dx = me.clientX - startX;
      const base = isOpen ? -DELETE_PX : 0;
      const clamped = Math.min(0, Math.max(-DELETE_PX, base + dx));
      card.style.transform = `translateX(${clamped}px)`;
    };
    cardMouseUpHandler = (me: MouseEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = me.clientX - startX;
      if (!isOpen && dx < -40) { openCard_(); return; }
      closeCard();
    };
    window.addEventListener('mousemove', cardMouseMoveHandler);
    window.addEventListener('mouseup', cardMouseUpHandler);
  });

  // Re-tap to close (tap card body while open)
  card.addEventListener('click', (e) => {
    if (isOpen) {
      e.stopPropagation();
      closeCard();
    }
  });

  // Delete button tap
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onDelete();
  });
}

// ─── 描画: リストビュー ────────────────────────────────
function renderList(area: HTMLElement, list: Schedule[], currentUserId: number, onDelete: (id: number) => void): void {
  area.innerHTML = '';
  if (list.length === 0) {
    area.innerHTML = '<div class="day-empty">予定なし</div>';
    return;
  }

  list.forEach(s => {
    const wrap = document.createElement('div');
    wrap.className = 'day-card-swipe-wrap';

    const isCreator = s.creatorId === currentUserId;
    let deleteBtn: HTMLButtonElement | null = null;
    if (isCreator) {
      deleteBtn = document.createElement('button');
      deleteBtn.className = 'day-delete-btn';
      deleteBtn.textContent = '削除';
      wrap.appendChild(deleteBtn);
    }

    const card = document.createElement('div');
    card.className   = 'day-card';
    card.dataset.id  = String(s.id);

    // genre bar
    const bar = document.createElement('div');
    bar.className = 'day-card-genre-bar';
    bar.style.backgroundColor = s.genre?.colorHex ?? '#9e9e9e';

    // body
    const body = document.createElement('div');
    body.className = 'day-card-body';

    const titleEl = document.createElement('div');
    titleEl.className   = 'day-card-title';
    titleEl.textContent = s.title;

    const timeEl = document.createElement('div');
    timeEl.className   = 'day-card-time';
    timeEl.textContent = `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`;

    body.appendChild(titleEl);
    body.appendChild(timeEl);
    card.appendChild(bar);
    card.appendChild(body);
    wrap.appendChild(card);
    area.appendChild(wrap);

    if (isCreator && deleteBtn) {
      attachCardSwipe(card, deleteBtn, () => onDelete(s.id));
    }
  });
}

// ─── 描画: タイムラインビュー ─────────────────────────
function renderTimeline(area: HTMLElement, list: Schedule[], currentUserId: number, onDelete: (id: number) => void): void {
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

    // ラッパーが absolute 配置を担当
    const wrap = document.createElement('div');
    wrap.className  = 'day-event-swipe-wrap';
    wrap.style.top    = `${top}px`;
    wrap.style.height = `${height}px`;

    const isCreator = s.creatorId === currentUserId;
    let deleteBtn: HTMLButtonElement | null = null;
    if (isCreator) {
      deleteBtn = document.createElement('button');
      deleteBtn.className = 'day-delete-btn';
      deleteBtn.textContent = '削除';
      wrap.appendChild(deleteBtn);
    }

    const block = document.createElement('div');
    block.className  = 'day-event-block';
    block.dataset.id = String(s.id);
    // NO style.top/height/left/right — CSS and wrapper handle that

    const genreBar = document.createElement('div');
    genreBar.className = 'day-event-genre-bar';
    genreBar.style.backgroundColor = s.genre?.colorHex ?? '#9e9e9e';

    const bodyEl = document.createElement('div');
    bodyEl.className = 'day-event-body';

    const titleEl = document.createElement('div');
    titleEl.className   = 'day-event-title';
    titleEl.textContent = s.title;

    const timeEl = document.createElement('div');
    timeEl.className   = 'day-event-time';
    timeEl.textContent = `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`;

    bodyEl.appendChild(titleEl);
    bodyEl.appendChild(timeEl);
    block.appendChild(genreBar);
    block.appendChild(bodyEl);
    wrap.appendChild(block);
    container.appendChild(wrap);

    if (isCreator && deleteBtn) {
      attachCardSwipe(block, deleteBtn, () => onDelete(s.id));
    }
  });

  area.appendChild(container);

  // 自動スクロール位置
  const startMinutes = list
    .filter(s => s.startTime)
    .map(s => timeToMinutes(s.startTime!));
  const scrollTo = startMinutes.length > 0 ? Math.min(...startMinutes) : 9 * 60;
  area.scrollTop = Math.max(0, (scrollTo / 60) * HOUR_HEIGHT - 40);
}

// ─── スワイプ（左右）─────────────────────────────────
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
  didSwipe = false;
  const dateStr = new URLSearchParams(location.search).get('date') ?? '';
  if (!dateStr) { navigate('/home'); return; }

  const currentUserId = parseInt(localStorage.getItem('currentUserId') ?? '0', 10);

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
      renderList(area, currentSchedules, currentUserId, handleDelete);
    } else {
      renderTimeline(area, currentSchedules, currentUserId, handleDelete);
    }
  }

  const deletingIds = new Set<number>();

  // 削除ハンドラ
  function handleDelete(id: number): void {
    if (deletingIds.has(id)) return;
    deletingIds.add(id);

    schedules.deleteSchedule(id)
      .then(result => {
        deletingIds.delete(id);
        if (!result.success) {
          closeOpenCard();
          return;
        }
        currentSchedules = currentSchedules.filter(s => s.id !== id);
        openCard = null;
        render();
      })
      .catch(() => {
        deletingIds.delete(id);
        closeOpenCard();
      });
  }

  // フェッチ
  schedules.getSchedules(dateStr, dateStr)
    .then(result => {
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
    })
    .catch(() => {
      area.innerHTML = '<div class="day-empty">予定を取得できませんでした</div>';
    });

  // 開いているスワイプカードを閉じる（別の場所タップ）
  page.addEventListener('click', () => closeOpenCard());

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
  attachSwipe(page, dateStr, newDate => navigate(`/day?date=${newDate}`, true));
}
