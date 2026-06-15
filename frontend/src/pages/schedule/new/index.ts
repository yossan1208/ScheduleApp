import './new.css';

// ─── モジュール状態（mount ごとにリセット） ────────────
// NOTE: 後タスクで各ボタンのロジック実装時に読み取り利用する
let selectedGenreId:    number              = 0;
let selectedGenreName:  string              = '';
let selectedGenreColor: string              = '';
let visibility:         'private' | 'group' = 'group';
let isAllDay:           boolean             = false;
let detailText:         string              = '';
let notificationTime:   string              = '09:00';

// ─── ユーティリティ ────────────────────────────────────
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function openSheet(id: string): void {
  document.getElementById(id)?.classList.add('open');
}

function closeSheet(id: string): void {
  document.getElementById(id)?.classList.remove('open');
}

// ─── マウント ──────────────────────────────────────────
export function mount(app: HTMLElement): void {
  selectedGenreId    = 0;
  selectedGenreName  = '';
  selectedGenreColor = '';
  visibility         = 'group';
  isAllDay           = false;
  detailText         = '';
  notificationTime   = '09:00';

  // 後タスクで利用するため参照（スキャフォールド用ダミー読み取り）
  void [selectedGenreId, selectedGenreName, selectedGenreColor,
        visibility, isAllDay, detailText, notificationTime];

  const dateParam = new URLSearchParams(location.search).get('date') ?? todayStr();

  app.innerHTML = `
    <div class="new-page">
      <div class="new-content">

        <input class="new-title" type="text" id="new-title" placeholder="タイトル" />

        <button class="new-genre-btn" id="btn-genre" aria-label="ジャンルを選択">
          <span class="new-genre-dot" id="genre-dot"></span>
          <span class="new-genre-label" id="genre-label">ジャンルを選択</span>
          <span class="new-genre-arrow">▼</span>
        </button>

        <div class="new-date-block">
          <input type="date" id="event-date" value="${dateParam}" />
        </div>

        <div class="new-time-row" id="time-row">
          <div class="new-time-block">
            <label for="start-time">開始</label>
            <input type="time" id="start-time" value="09:00" />
          </div>
          <div class="new-time-block">
            <label for="end-time">終了</label>
            <input type="time" id="end-time" value="10:00" />
          </div>
        </div>

        <div class="new-time-toggle">
          <button class="new-toggle-btn active" id="btn-set-time">Set Time</button>
          <button class="new-toggle-btn" id="btn-all-day">All Day</button>
        </div>

        <div class="new-row">
          <button class="new-notif-btn" id="btn-notif">🔔 09:00</button>
          <button class="new-visibility-btn" id="btn-visibility" aria-label="公開範囲">👥</button>
        </div>

        <button class="new-detail-btn" id="btn-detail">📝 詳細メモを追加…</button>

        <div class="new-error hidden" id="new-error"></div>

      </div>

      <div class="new-footer">
        <button class="nav-arrow-btn" id="btn-cancel" aria-label="キャンセル">✕</button>
        <button class="new-history-btn" id="btn-history" aria-label="履歴">↺</button>
        <button class="fab" id="btn-save" aria-label="保存">✓</button>
      </div>

      <!-- ジャンル選択シート -->
      <div class="sheet-overlay" id="overlay-genre">
        <div class="bottom-sheet">
          <div class="sheet-title">ジャンルを選択</div>
          <div id="genre-list"></div>
        </div>
      </div>

      <!-- 通知時刻シート -->
      <div class="sheet-overlay" id="overlay-notif">
        <div class="bottom-sheet">
          <div class="sheet-title">通知時刻を設定</div>
          <input class="sheet-time-input" type="time" id="notif-input" value="09:00" />
          <button class="sheet-confirm-btn" id="btn-notif-confirm">決定</button>
        </div>
      </div>

      <!-- 詳細メモシート -->
      <div class="sheet-overlay" id="overlay-detail">
        <div class="bottom-sheet">
          <div class="sheet-title">詳細メモ</div>
          <textarea class="sheet-textarea" id="detail-textarea" placeholder="詳細を入力（任意）"></textarea>
          <button class="sheet-confirm-btn" id="btn-detail-confirm">完了</button>
        </div>
      </div>

      <!-- 履歴シート -->
      <div class="sheet-overlay" id="overlay-history">
        <div class="bottom-sheet">
          <div class="sheet-title">最近の予定</div>
          <div id="history-list"></div>
        </div>
      </div>
    </div>
  `;

  // シート外タップで閉じる
  ['overlay-genre', 'overlay-notif', 'overlay-detail', 'overlay-history'].forEach(overlayId => {
    const overlay = app.querySelector(`#${overlayId}`)!;
    const sheet   = overlay.querySelector('.bottom-sheet')!;
    overlay.addEventListener('click', e => {
      if (!sheet.contains(e.target as Node)) closeSheet(overlayId);
    });
  });

  // キャンセル
  app.querySelector('#btn-cancel')!
    .addEventListener('click', () => history.back());
}
