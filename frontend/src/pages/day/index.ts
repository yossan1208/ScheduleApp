import './day.css';
import { schedules, type Schedule } from '../../api/schedules';
import { navigate, registerPopstateHook, unregisterPopstateHook } from '../../utils/router';

// ─── 定数 ─────────────────────────────────────────────
const VIEW_MODE_KEY = 'scr20_view_mode';
const HOUR_HEIGHT   = 60;
const DAY_NAMES_JA  = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
const DELETE_PX     = 64;
const SHEET_CLOSE_THRESHOLD = 80; // px

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

function isDarkColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

function formatDate(dateStr: string): string {
  const days   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(dateStr + 'T00:00:00');
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
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

  card.addEventListener('click', (e) => {
    if (isOpen) {
      e.stopPropagation();
      closeCard();
    }
  });

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onDelete();
  });
}

// ─── シートのドラッグ（ハンドル） ────────────────────
function attachSheetDrag(
  handle: HTMLElement,
  sheet: HTMLElement,
  onClose: () => void,
): void {
  let startY = 0;
  let dragging = false;
  let sdMouseMove: ((e: MouseEvent) => void) | null = null;
  let sdMouseUp: ((e: MouseEvent) => void) | null = null;

  function onStart(y: number): void {
    startY = y;
    dragging = true;
    sheet.style.transition = 'none';
  }

  function onMove(y: number): void {
    if (!dragging) return;
    const dy = Math.max(0, y - startY);
    sheet.style.transform = `translateY(${dy}px)`;
  }

  function onEnd(y: number): void {
    if (!dragging) return;
    dragging = false;
    const dy = Math.max(0, y - startY);
    if (dy >= SHEET_CLOSE_THRESHOLD) {
      onClose();
    } else {
      sheet.style.transition = 'transform 0.3s ease';
      sheet.style.transform = 'translateY(0)';
    }
  }

  handle.addEventListener('touchstart', e => onStart(e.touches[0].clientY), { passive: true });
  handle.addEventListener('touchmove', e => {
    e.preventDefault();
    onMove(e.touches[0].clientY);
  }, { passive: false });
  handle.addEventListener('touchend', e => onEnd(e.changedTouches[0].clientY));

  handle.addEventListener('mousedown', e => {
    onStart(e.clientY);
    sdMouseMove = (me: MouseEvent) => onMove(me.clientY);
    sdMouseUp   = (me: MouseEvent) => {
      onEnd(me.clientY);
      if (sdMouseMove) window.removeEventListener('mousemove', sdMouseMove);
      if (sdMouseUp)   window.removeEventListener('mouseup', sdMouseUp);
    };
    window.addEventListener('mousemove', sdMouseMove);
    window.addEventListener('mouseup', sdMouseUp);
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

    const bar = document.createElement('div');
    bar.className = 'day-card-genre-bar';
    bar.style.backgroundColor = s.genre?.colorHex ?? '#9e9e9e';

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

  list.forEach(s => {
    if (!s.startTime || !s.endTime) return;

    const startMin = timeToMinutes(s.startTime);
    const endMin   = timeToMinutes(s.endTime);
    const top      = (startMin / 60) * HOUR_HEIGHT;
    const height   = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);

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

  const startMinutes = list
    .filter(s => s.startTime)
    .map(s => timeToMinutes(s.startTime!));
  const scrollTo = startMinutes.length > 0 ? Math.min(...startMinutes) : 9 * 60;
  area.scrollTop = Math.max(0, (scrollTo / 60) * HOUR_HEIGHT - 40);
}

// ─── スワイプ（左右） ─────────────────────────────────
function attachSwipe(
  el: HTMLElement,
  currentDate: string,
  onSwipe: (newDate: string) => void,
  isSheetOpen: () => boolean,
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
    if (isSheetOpen()) return;

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

// ─── エントリポイント ──────────────────────────────────
export function mount(app: HTMLElement): void {
  didSwipe = false;

  const sheetMatch = location.pathname.match(/^\/schedule\/(\d+)$/);
  const dateParam  = new URLSearchParams(location.search).get('date') ?? '';

  if (!sheetMatch && !dateParam) { navigate('/home'); return; }

  if (sheetMatch) {
    const sheetId = parseInt(sheetMatch[1], 10);
    schedules.getScheduleById(sheetId)
      .then(r => {
        if (!r.success || !r.data) { navigate('/home'); return; }
        mountDay(app, r.data.date.slice(0, 10), sheetId);
      })
      .catch(() => navigate('/home'));
    return;
  }

  mountDay(app, dateParam, null);
}

// ─── day ページ本体 ────────────────────────────────────
function mountDay(app: HTMLElement, dateStr: string, openSheetId: number | null): void {
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
    <div class="day-sheet-overlay" id="day-sheet-overlay" style="opacity:0;pointer-events:none;"></div>
    <div class="day-sheet" id="day-sheet">
      <div class="day-sheet-handle" id="day-sheet-handle"></div>
      <div class="day-sheet-header">
        <span class="day-sheet-title" id="day-sheet-title"></span>
        <button class="day-sheet-edit-btn" id="day-sheet-edit" aria-label="編集">✏️</button>
      </div>
      <div class="day-sheet-body" id="day-sheet-body"></div>
    </div>
  `;

  const area    = app.querySelector<HTMLElement>('#day-schedule-area')!;
  const toggle  = app.querySelector<HTMLElement>('#btn-toggle')!;
  const page    = app.querySelector<HTMLElement>('#day-page')!;
  const overlay = app.querySelector<HTMLElement>('#day-sheet-overlay')!;
  const sheet   = app.querySelector<HTMLElement>('#day-sheet')!;
  const handle  = app.querySelector<HTMLElement>('#day-sheet-handle')!;
  const sheetBody  = app.querySelector<HTMLElement>('#day-sheet-body')!;
  const sheetTitle = app.querySelector<HTMLElement>('#day-sheet-title')!;
  const sheetEdit  = app.querySelector<HTMLButtonElement>('#day-sheet-edit')!;

  let currentMode: ViewMode = savedMode;
  let currentSchedules: Schedule[] = [];
  let sheetVisible = false;

  // ─── シート: 表示 ──────────────────────────────────
  function showSheetUI(): void {
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'auto';
    overlay.style.transition = 'opacity 0.25s ease';
    sheet.style.transition = 'none';
    sheet.style.transform = 'translateY(100%)';
    void sheet.offsetHeight; // force reflow
    sheet.style.transition = 'transform 0.3s ease';
    sheet.style.transform = 'translateY(0)';
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    sheetVisible = true;
  }

  // ─── シート: 非表示 ────────────────────────────────
  function hideSheetUI(): void {
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    sheet.style.transition = 'transform 0.3s ease';
    sheet.style.transform = 'translateY(100%)';
    sheetVisible = false;
  }

  // ─── シートを閉じてブラウザ履歴を戻す ─────────────
  function triggerCloseSheet(): void {
    hideSheetUI();
    setTimeout(() => history.back(), 300);
  }

  // ─── シートを開いて予定を読み込む ─────────────────
  function openScheduleSheet(scheduleId: number): void {
    sheetTitle.textContent = '';
    sheetBody.innerHTML = '';
    const loadEl = document.createElement('div');
    loadEl.className = 'day-sheet-loading';
    loadEl.textContent = '読み込み中…';
    sheetBody.appendChild(loadEl);
    showSheetUI();

    schedules.getScheduleById(scheduleId)
      .then(result => {
        if (!result.success || !result.data) {
          sheetBody.innerHTML = '';
          const errEl = document.createElement('div');
          errEl.className = 'day-sheet-loading';
          errEl.textContent = '取得に失敗しました';
          sheetBody.appendChild(errEl);
          return;
        }
        const s = result.data;

        sheetTitle.textContent = s.title;

        sheetEdit.onclick = () => {
          hideSheetUI();
          navigate(`/schedule/${s.id}/edit`);
        };

        const timeStr = s.startTime
          ? `${s.startTime.slice(0, 5)}${s.endTime ? ` - ${s.endTime.slice(0, 5)}` : ''}`
          : '終日';
        const storedId = parseInt(localStorage.getItem('currentUserId') ?? '0', 10);
        const creatorLabel = s.creatorId === storedId ? '自分' : '他のメンバー';

        sheetBody.innerHTML = '';

        const timePara = document.createElement('p');
        timePara.className = 'day-sheet-time';
        timePara.textContent = timeStr;
        sheetBody.appendChild(timePara);

        const datePara = document.createElement('p');
        datePara.className = 'day-sheet-date';
        datePara.textContent = formatDate(s.date);
        sheetBody.appendChild(datePara);

        if (s.genre) {
          const badge = document.createElement('span');
          badge.className = 'day-sheet-genre-badge';
          badge.style.background = s.genre.colorHex;
          badge.style.color = isDarkColor(s.genre.colorHex) ? '#ffffff' : '#1a1a1a';
          badge.textContent = s.genre.name;
          sheetBody.appendChild(badge);
        }

        const notifSec = document.createElement('div');
        notifSec.className = 'day-sheet-section';
        const notifIcon = document.createElement('span');
        notifIcon.className = 'day-sheet-icon';
        notifIcon.textContent = '🔔';
        const notifInfo = document.createElement('span');
        notifInfo.className = 'day-sheet-info';
        notifInfo.textContent = s.notificationTime.slice(0, 5);
        notifSec.appendChild(notifIcon);
        notifSec.appendChild(notifInfo);
        sheetBody.appendChild(notifSec);

        const withSec = document.createElement('div');
        withSec.className = 'day-sheet-section';
        const withLabel = document.createElement('span');
        withLabel.className = 'day-sheet-label';
        withLabel.textContent = 'With';
        const withRow = document.createElement('div');
        withRow.className = 'day-sheet-with-row';
        const avatar = document.createElement('div');
        avatar.className = 'day-sheet-avatar';
        avatar.textContent = '👤';
        const withInfo = document.createElement('span');
        withInfo.className = 'day-sheet-info';
        withInfo.textContent = creatorLabel;
        withRow.appendChild(avatar);
        withRow.appendChild(withInfo);
        withSec.appendChild(withLabel);
        withSec.appendChild(withRow);
        sheetBody.appendChild(withSec);

        if (s.detail) {
          const memoSec = document.createElement('div');
          memoSec.className = 'day-sheet-memo';
          const memoText = document.createElement('p');
          memoText.className = 'day-sheet-memo-text';
          memoText.textContent = s.detail;
          memoSec.appendChild(memoText);
          sheetBody.appendChild(memoSec);
        }
      })
      .catch(() => {
        sheetBody.innerHTML = '';
        const errEl = document.createElement('div');
        errEl.className = 'day-sheet-loading';
        errEl.textContent = '取得に失敗しました';
        sheetBody.appendChild(errEl);
      });
  }

  // ─── シートインタラクション ────────────────────────
  overlay.addEventListener('click', () => triggerCloseSheet());
  attachSheetDrag(handle, sheet, triggerCloseSheet);

  // ─── popstate フック登録 ──────────────────────────
  registerPopstateHook((path: string) => {
    if (!app.querySelector('#day-page')) {
      unregisterPopstateHook();
      return false;
    }
    const m = path.match(/^\/schedule\/(\d+)$/);
    if (m) {
      openScheduleSheet(parseInt(m[1], 10));
      return true;
    }
    if (path.startsWith('/day')) {
      hideSheetUI();
      return true;
    }
    return false;
  });

  // ─── 描画 ─────────────────────────────────────────
  function render(): void {
    if (currentMode === 'list') {
      renderList(area, currentSchedules, currentUserId, handleDelete);
    } else {
      renderTimeline(area, currentSchedules, currentUserId, handleDelete);
    }
  }

  const deletingIds = new Set<number>();

  function handleDelete(id: number): void {
    if (deletingIds.has(id)) return;
    deletingIds.add(id);

    schedules.deleteSchedule(id)
      .then(result => {
        deletingIds.delete(id);
        if (!result.success) { closeOpenCard(); return; }
        currentSchedules = currentSchedules.filter(s => s.id !== id);
        openCard = null;
        render();
      })
      .catch(() => {
        deletingIds.delete(id);
        closeOpenCard();
      });
  }

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

  page.addEventListener('click', () => closeOpenCard());

  // 予定タップ → シートを開く
  area.addEventListener('click', e => {
    if (didSwipe) { didSwipe = false; return; }
    const card = (e.target as Element).closest<HTMLElement>('[data-id]');
    if (!card?.dataset.id) return;
    const id = parseInt(card.dataset.id, 10);
    history.pushState(null, '', `/schedule/${id}`);
    openScheduleSheet(id);
  });

  toggle.addEventListener('click', () => {
    currentMode = currentMode === 'list' ? 'timeline' : 'list';
    toggle.dataset.mode = currentMode;
    localStorage.setItem(VIEW_MODE_KEY, currentMode);
    render();
  });

  app.querySelector('#btn-back')!
    .addEventListener('click', () => history.back());

  app.querySelector('#btn-add')!
    .addEventListener('click', () => navigate(`/schedule/new?date=${dateStr}`));

  attachSwipe(
    page,
    dateStr,
    newDate => navigate(`/day?date=${newDate}`, true),
    () => sheetVisible,
  );

  if (openSheetId !== null) openScheduleSheet(openSheetId);
}
