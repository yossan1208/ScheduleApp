import './new.css';
import { genres } from '../../../api/genres';
import { schedules, type CreateSchedulePayload } from '../../../api/schedules';
import { navigate } from '../../../utils/router';
import { t } from '../../../utils/i18n';

// ─── モジュール状態（mount ごとにリセット） ────────────
// NOTE: 後タスクで各ボタンのロジック実装時に読み取り利用する
let selectedGenreId:    number              = 0;
let selectedGenreName:  string              = '';
let selectedGenreColor: string              = '';
let visibility:         'private' | 'group' = 'group';
let isAllDay:           boolean             = false;
let detailText:         string              = '';
let notificationTime:   string              = '09:00';

// selectedGenreName / selectedGenreColor は DOM 反映済み（変数として保持）
void [selectedGenreName, selectedGenreColor];

// ─── ユーティリティ ────────────────────────────────────
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function openSheet(id: string): void {
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

  const dateParam = new URLSearchParams(location.search).get('date') ?? todayStr();

  app.innerHTML = `
    <div class="new-page">
      <div class="new-content">

        <input class="new-title" type="text" id="new-title" placeholder="${t('schedule.label.title')}" />

        <button class="new-genre-btn" id="btn-genre" aria-label="${t('schedule.genre.placeholder')}">
          <span class="new-genre-dot" id="genre-dot"></span>
          <span class="new-genre-label" id="genre-label">${t('schedule.genre.placeholder')}</span>
          <span class="new-genre-arrow">▼</span>
        </button>

        <div class="new-date-block">
          <input type="date" id="event-date" value="${dateParam}" />
        </div>

        <div class="new-time-row" id="time-row">
          <div class="new-time-block">
            <label for="start-time">${t('schedule.label.startTime')}</label>
            <input type="time" id="start-time" value="09:00" />
          </div>
          <div class="new-time-block">
            <label for="end-time">${t('schedule.label.endTime')}</label>
            <input type="time" id="end-time" value="10:00" />
          </div>
        </div>

        <div class="new-time-toggle">
          <button class="new-toggle-btn active" id="btn-set-time">Set Time</button>
          <button class="new-toggle-btn" id="btn-all-day">All Day</button>
        </div>

        <div class="new-row">
          <button class="new-notif-btn" id="btn-notif">🔔 09:00</button>
          <button class="new-visibility-btn" id="btn-visibility" aria-label="${t('schedule.label.visibility')}">👥 ${t('schedule.visibility.public')}</button>
        </div>

        <button class="new-detail-btn" id="btn-detail">${t('schedule.memo.add')}</button>

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
          <div class="sheet-title">${t('schedule.genre.placeholder')}</div>
          <div id="genre-list"></div>
        </div>
      </div>

      <!-- 通知時刻シート -->
      <div class="sheet-overlay" id="overlay-notif">
        <div class="bottom-sheet">
          <div class="sheet-title">${t('schedule.notif.setTime')}</div>
          <input class="sheet-time-input" type="time" id="notif-input" value="09:00" />
          <button class="sheet-confirm-btn" id="btn-notif-confirm">決定</button>
        </div>
      </div>

      <!-- 詳細メモシート -->
      <div class="sheet-overlay" id="overlay-detail">
        <div class="bottom-sheet">
          <div class="sheet-title">${t('schedule.memo.title')}</div>
          <textarea class="sheet-textarea" id="detail-textarea" placeholder="${t('schedule.memo.placeholder')}"></textarea>
          <button class="sheet-confirm-btn" id="btn-detail-confirm">完了</button>
        </div>
      </div>

      <!-- 履歴シート -->
      <div class="sheet-overlay" id="overlay-history">
        <div class="bottom-sheet">
          <div class="sheet-title">${t('schedule.history.recent')}</div>
          <div id="history-list"></div>
        </div>
      </div>
    </div>
  `;

  // ─── ジャンルシート ───────────────────────────────────
  app.querySelector('#btn-genre')!.addEventListener('click', () => {
    openSheet('overlay-genre');
    const list = app.querySelector<HTMLElement>('#genre-list')!;
    list.innerHTML = `<div style="color:#888;padding:0.5rem 0">${t('schedule.history.loading')}</div>`;
    genres.getGenres()
      .then(result => {
        list.innerHTML = '';
        if (!result.success || !result.data?.length) {
          list.innerHTML = `<div style="color:#888;padding:0.5rem 0">${t('schedule.error.noGenreList')}</div>`;
          return;
        }
        result.data.forEach(g => {
          const item = document.createElement('div');
          item.className = 'sheet-genre-item';
          item.innerHTML = `
            <span class="sheet-genre-color" style="background:${g.colorHex}"></span>
            <span>${g.name}</span>
          `;
          item.addEventListener('click', () => {
            selectedGenreId    = g.id;
            selectedGenreName  = g.name;
            selectedGenreColor = g.colorHex;
            app.querySelector<HTMLElement>('#genre-dot')!.style.background = g.colorHex;
            app.querySelector<HTMLElement>('#genre-label')!.textContent    = g.name;
            app.querySelector<HTMLElement>('#btn-genre')!.classList.add('selected');
            closeSheet('overlay-genre');
          });
          list.appendChild(item);
        });
      })
      .catch(() => {
        list.innerHTML = `<div style="color:#888;padding:0.5rem 0">${t('schedule.history.error')}</div>`;
      });
  });

  // シート外タップで閉じる
  ['overlay-genre', 'overlay-notif', 'overlay-detail', 'overlay-history'].forEach(overlayId => {
    const overlay = app.querySelector(`#${overlayId}`)!;
    const sheet   = overlay.querySelector('.bottom-sheet')!;
    overlay.addEventListener('click', e => {
      if (!sheet.contains(e.target as Node)) closeSheet(overlayId);
    });
  });

  // ─── Set Time / All Day トグル ────────────────────────
  const timeRow    = app.querySelector<HTMLElement>('#time-row')!;
  const btnSetTime = app.querySelector<HTMLElement>('#btn-set-time')!;
  const btnAllDay  = app.querySelector<HTMLElement>('#btn-all-day')!;

  btnSetTime.addEventListener('click', () => {
    isAllDay = false;
    btnSetTime.classList.add('active');
    btnAllDay.classList.remove('active');
    timeRow.style.display = '';
  });

  btnAllDay.addEventListener('click', () => {
    isAllDay = true;
    btnAllDay.classList.add('active');
    btnSetTime.classList.remove('active');
    timeRow.style.display = 'none';
  });

  // ─── 通知時刻シート ───────────────────────────────────
  const notifInput = app.querySelector<HTMLInputElement>('#notif-input')!;
  notifInput.value = notificationTime;

  app.querySelector('#btn-notif')!.addEventListener('click', () => {
    notifInput.value = notificationTime;
    openSheet('overlay-notif');
    setTimeout(() => notifInput.focus(), 260);
  });

  app.querySelector('#btn-notif-confirm')!.addEventListener('click', () => {
    if (notifInput.value) {
      notificationTime = notifInput.value;
      app.querySelector('#btn-notif')!.textContent = `🔔 ${notificationTime}`;
    }
    closeSheet('overlay-notif');
  });

  // ─── Visibility トグル ───────────────────────────────
  app.querySelector('#btn-visibility')!.addEventListener('click', () => {
    visibility = visibility === 'group' ? 'private' : 'group';
    (app.querySelector('#btn-visibility') as HTMLElement).textContent =
      visibility === 'group' ? `👥 ${t('schedule.visibility.public')}` : `🔒 ${t('schedule.visibility.private')}`;
  });

  // ─── 詳細メモシート ───────────────────────────────────
  const detailTextarea = app.querySelector<HTMLTextAreaElement>('#detail-textarea')!;

  app.querySelector('#btn-detail')!.addEventListener('click', () => {
    detailTextarea.value = detailText;
    openSheet('overlay-detail');
    setTimeout(() => detailTextarea.focus(), 260);
  });

  app.querySelector('#btn-detail-confirm')!.addEventListener('click', () => {
    detailText = detailTextarea.value.trim();
    const btn = app.querySelector<HTMLElement>('#btn-detail')!;
    if (detailText) {
      btn.textContent = `📝 ${detailText.slice(0, 30)}${detailText.length > 30 ? '…' : ''}`;
      btn.classList.add('filled');
    } else {
      btn.textContent = t('schedule.memo.add');
      btn.classList.remove('filled');
    }
    closeSheet('overlay-detail');
  });

  // ─── 履歴シート ───────────────────────────────────────
  app.querySelector('#btn-history')!.addEventListener('click', () => {
    openSheet('overlay-history');
    const list = app.querySelector<HTMLElement>('#history-list')!;
    list.innerHTML = `<div style="color:#888;padding:0.5rem 0">${t('schedule.history.loading')}</div>`;

    schedules.getRecentSchedules()
      .then(result => {
        list.innerHTML = '';
        if (!result.success || !result.data?.length) {
          list.innerHTML = `<div style="color:#888;padding:0.5rem 0">${t('schedule.history.empty')}</div>`;
          return;
        }
        result.data.forEach(s => {
          const item = document.createElement('div');
          item.className = 'sheet-history-item';
          const color   = s.genre?.colorHex ?? '#555';
          const timeStr = s.startTime ? ` ${s.startTime.slice(0, 5)}` : '';
          item.innerHTML = `
            <div class="sheet-history-bar" style="background:${color}"></div>
            <div class="sheet-history-body">
              <div class="sheet-history-title"></div>
              <div class="sheet-history-date"></div>
            </div>
          `;
          item.querySelector<HTMLElement>('.sheet-history-title')!.textContent = s.title;
          item.querySelector<HTMLElement>('.sheet-history-date')!.textContent  = `${s.date}${timeStr}`;
          item.addEventListener('click', () => {
            // タイトル反映
            app.querySelector<HTMLInputElement>('#new-title')!.value = s.title;
            // ジャンル反映
            if (s.genre) {
              selectedGenreId    = s.genre.id;
              selectedGenreName  = s.genre.name;
              selectedGenreColor = s.genre.colorHex;
              app.querySelector<HTMLElement>('#genre-dot')!.style.background = s.genre.colorHex;
              app.querySelector<HTMLElement>('#genre-label')!.textContent     = s.genre.name;
              app.querySelector<HTMLElement>('#btn-genre')!.classList.add('selected');
            }
            // 時刻反映（日付は反映しない）
            if (s.startTime) {
              app.querySelector<HTMLInputElement>('#start-time')!.value = s.startTime.slice(0, 5);
              if (isAllDay) {
                isAllDay = false;
                app.querySelector<HTMLElement>('#btn-all-day')!.classList.remove('active');
                app.querySelector<HTMLElement>('#btn-set-time')!.classList.add('active');
                app.querySelector<HTMLElement>('#time-row')!.style.display = '';
              }
            }
            if (s.endTime) {
              app.querySelector<HTMLInputElement>('#end-time')!.value = s.endTime.slice(0, 5);
            }
            // 通知時刻反映
            if (s.notificationTime) {
              notificationTime = s.notificationTime.slice(0, 5);
              app.querySelector('#btn-notif')!.textContent = `🔔 ${notificationTime}`;
            }
            closeSheet('overlay-history');
          });
          list.appendChild(item);
        });
      })
      .catch(() => {
        list.innerHTML = `<div style="color:#888;padding:0.5rem 0">${t('schedule.history.error')}</div>`;
      });
  });

  // ─── バリデーション + 保存 ────────────────────────────
  const errorEl = app.querySelector<HTMLElement>('#new-error')!;
  const saveBtn = app.querySelector<HTMLButtonElement>('#btn-save')!;

  function showError(msg: string): void {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearError(): void {
    errorEl.classList.add('hidden');
  }

  saveBtn.addEventListener('click', () => {
    clearError();

    const title     = app.querySelector<HTMLInputElement>('#new-title')!.value.trim();
    const eventDate = app.querySelector<HTMLInputElement>('#event-date')!.value;
    const startTime = isAllDay ? null
      : (app.querySelector<HTMLInputElement>('#start-time')!.value || null);
    const endTime   = isAllDay ? null
      : (app.querySelector<HTMLInputElement>('#end-time')!.value || null);

    if (!title)           { showError(t('schedule.error.noTitle')); return; }
    if (!selectedGenreId) { showError(t('schedule.error.noGenre')); return; }

    const payload: CreateSchedulePayload = {
      date:            eventDate,
      title,
      visibility,
      genreId:         selectedGenreId,
      startTime,
      endTime,
      notificationTime,
      detail:          detailText || null,
    };

    saveBtn.disabled = true;

    schedules.createSchedule(payload)
      .then(result => {
        saveBtn.disabled = false;
        if (!result.success || !result.data) {
          showError(result.error?.message ?? t('common.error.save'));
          return;
        }
        navigate(`/schedule/${result.data.id}`, true);
      })
      .catch(() => {
        saveBtn.disabled = false;
        showError(t('common.error.network'));
      });
  });

  // キャンセル
  app.querySelector('#btn-cancel')!
    .addEventListener('click', () => history.back());
}
