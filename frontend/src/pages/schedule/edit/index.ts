import './edit.css';
import { schedules, type UpdateSchedulePayload } from '../../../api/schedules';
import { genres } from '../../../api/genres';
import { navigate } from '../../../utils/router';
import { t } from '../../../utils/i18n';

let selectedGenreId:    number              = 0;
let selectedGenreName:  string              = '';
let selectedGenreColor: string              = '';
let visibility:         'private' | 'group' = 'group';
let isAllDay:           boolean             = false;
let detailText:         string              = '';
let notificationTime:   string              = '09:00';

void [selectedGenreName, selectedGenreColor];

function openSheet(id: string): void {
  document.getElementById(id)?.classList.add('open');
}

function closeSheet(id: string): void {
  document.getElementById(id)?.classList.remove('open');
}

function showErrorPage(app: HTMLElement, msg: string): void {
  app.innerHTML = `<div class="detail-error"><span></span><button class="detail-error-btn">ホームに戻る</button></div>`;
  app.querySelector<HTMLElement>('.detail-error span')!.textContent = msg;
  app.querySelector('.detail-error-btn')!.addEventListener('click', () => navigate('/month'));
}

export function mount(app: HTMLElement): void {
  selectedGenreId    = 0;
  selectedGenreName  = '';
  selectedGenreColor = '';
  visibility         = 'group';
  isAllDay           = false;
  detailText         = '';
  notificationTime   = '09:00';

  // /schedule/123/edit → id = 123
  const parts = location.pathname.split('/');
  const id    = parseInt(parts[parts.length - 2], 10);

  if (!id || isNaN(id)) {
    showErrorPage(app, '予定が見つかりません');
    return;
  }

  app.innerHTML = `<div class="detail-loading">${t('common.loading')}</div>`;

  schedules.getScheduleById(id)
    .then(result => {
      if (!result.success || !result.data) {
        showErrorPage(app, '予定が見つかりません');
        return;
      }

      const s = result.data;

      // モジュール変数を既存データで初期化
      selectedGenreId  = s.genre?.id ?? 0;
      selectedGenreName  = s.genre?.name ?? '';
      selectedGenreColor = s.genre?.colorHex ?? '';
      visibility       = (s.visibility === 'private' ? 'private' : 'group') as 'private' | 'group';
      isAllDay         = s.startTime === null;
      detailText       = s.detail ?? '';
      notificationTime = s.notificationTime.slice(0, 5);

      const dateStr    = s.date.slice(0, 10);
      const startVal   = s.startTime?.slice(0, 5) ?? '09:00';
      const endVal     = s.endTime?.slice(0, 5) ?? '10:00';
      const genreSel   = s.genre ? ' selected' : '';
      const visLabel   = visibility === 'group' ? `👥 ${t('schedule.visibility.public')}` : `🔒 ${t('schedule.visibility.private')}`;
      const detailFilled = detailText ? ' filled' : '';

      app.innerHTML = `
        <div class="new-page">
          <div class="new-content">

            <input class="new-title" type="text" id="new-title" placeholder="${t('schedule.label.title')}" />

            <button class="new-genre-btn${genreSel}" id="btn-genre" aria-label="${t('schedule.genre.placeholder')}">
              <span class="new-genre-dot" id="genre-dot"></span>
              <span class="new-genre-label" id="genre-label"></span>
              <span class="new-genre-arrow">▼</span>
            </button>

            <div class="new-date-block">
              <input type="date" id="event-date" value="${dateStr}" />
            </div>

            <div class="new-time-row" id="time-row"${isAllDay ? ' style="display:none"' : ''}>
              <div class="new-time-block">
                <label for="start-time">${t('schedule.label.startTime')}</label>
                <input type="time" id="start-time" value="${startVal}" />
              </div>
              <div class="new-time-block">
                <label for="end-time">${t('schedule.label.endTime')}</label>
                <input type="time" id="end-time" value="${endVal}" />
              </div>
            </div>

            <div class="new-time-toggle">
              <button class="new-toggle-btn${isAllDay ? '' : ' active'}" id="btn-set-time">Set Time</button>
              <button class="new-toggle-btn${isAllDay ? ' active' : ''}" id="btn-all-day">All Day</button>
            </div>

            <div class="new-row">
              <button class="new-notif-btn" id="btn-notif">🔔 ${notificationTime}</button>
              <button class="new-visibility-btn" id="btn-visibility" aria-label="${t('schedule.label.visibility')}">${visLabel}</button>
            </div>

            <button class="new-detail-btn${detailFilled}" id="btn-detail"></button>

            <div class="new-error hidden" id="new-error"></div>

          </div>

          <div class="new-footer">
            <button class="nav-arrow-btn" id="btn-cancel" aria-label="キャンセル">✕</button>
            <button class="edit-delete-btn" id="btn-delete" aria-label="削除">🗑</button>
            <button class="fab" id="btn-save" aria-label="更新">↻</button>
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
              <div class="sheet-title">通知時刻を設定</div>
              <input class="sheet-time-input" type="time" id="notif-input" value="${notificationTime}" />
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
        </div>
      `;

      // XSS対策: textContent / value で値を設定
      app.querySelector<HTMLInputElement>('#new-title')!.value = s.title;

      if (s.genre) {
        app.querySelector<HTMLElement>('#genre-dot')!.style.background = s.genre.colorHex;
        app.querySelector<HTMLElement>('#genre-label')!.textContent    = s.genre.name;
      } else {
        app.querySelector<HTMLElement>('#genre-label')!.textContent = t('schedule.genre.placeholder');
      }

      const detailBtn = app.querySelector<HTMLElement>('#btn-detail')!;
      if (detailText) {
        detailBtn.textContent = `📝 ${detailText.slice(0, 30)}${detailText.length > 30 ? '…' : ''}`;
      } else {
        detailBtn.textContent = t('schedule.memo.add');
      }

      // ─── エラー表示ユーティリティ ────────────────────────
      const errorEl = app.querySelector<HTMLElement>('#new-error')!;

      function showError(msg: string): void {
        errorEl.textContent = msg;
        errorEl.classList.remove('hidden');
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      function clearError(): void {
        errorEl.classList.add('hidden');
      }

      // ─── ジャンルシート ───────────────────────────────────
      app.querySelector('#btn-genre')!.addEventListener('click', () => {
        openSheet('overlay-genre');
        const list = app.querySelector<HTMLElement>('#genre-list')!;
        list.innerHTML = `<div style="color:#888;padding:0.5rem 0">${t('schedule.history.loading')}</div>`;
        genres.getGenres()
          .then(res => {
            list.innerHTML = '';
            if (!res.success || !res.data?.length) {
              list.innerHTML = `<div style="color:#888;padding:0.5rem 0">${t('schedule.error.noGenreList')}</div>`;
              return;
            }
            res.data.forEach(g => {
              const item = document.createElement('div');
              item.className = 'sheet-genre-item';
              const dot  = document.createElement('span');
              dot.className = 'sheet-genre-color';
              dot.style.background = g.colorHex;
              const name = document.createElement('span');
              name.textContent = g.name;
              item.appendChild(dot);
              item.appendChild(name);
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
      ['overlay-genre', 'overlay-notif', 'overlay-detail'].forEach(overlayId => {
        const overlay = app.querySelector(`#${overlayId}`)!;
        const sheet   = overlay.querySelector('.bottom-sheet')!;
        overlay.addEventListener('click', e => {
          if (!sheet.contains(e.target as Node)) closeSheet(overlayId);
        });
      });

      // ─── Set Time / All Day ──────────────────────────────
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

      // ─── 詳細メモシート ──────────────────────────────────
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

      // ─── キャンセル ──────────────────────────────────────
      app.querySelector('#btn-cancel')!
        .addEventListener('click', () => navigate(`/day?date=${s.date.slice(0, 10)}`, true));

      // ─── 削除 ────────────────────────────────────────────
      app.querySelector('#btn-delete')!.addEventListener('click', () => {
        if (!window.confirm(t('day.deleteConfirm'))) return;

        const deleteBtn = app.querySelector<HTMLButtonElement>('#btn-delete')!;
        deleteBtn.disabled = true;
        clearError();

        schedules.deleteSchedule(id)
          .then(delResult => {
            deleteBtn.disabled = false;
            if (!delResult.success) {
              showError(delResult.error?.message ?? t('genres.form.error.delete'));
              return;
            }
            navigate(`/day?date=${s.date.slice(0, 10)}`, true);
          })
          .catch(() => {
            deleteBtn.disabled = false;
            showError(t('common.error.network'));
          });
      });

      // ─── バリデーション + 更新 ────────────────────────────
      const saveBtn = app.querySelector<HTMLButtonElement>('#btn-save')!;

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

        const payload: UpdateSchedulePayload = {
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

        schedules.updateSchedule(id, payload)
          .then(upResult => {
            saveBtn.disabled = false;
            if (!upResult.success || !upResult.data) {
              showError(upResult.error?.message ?? t('common.error.save'));
              return;
            }
            navigate(`/schedule/${id}`, true);
          })
          .catch(() => {
            saveBtn.disabled = false;
            showError(t('common.error.network'));
          });
      });
    })
    .catch(() => {
      showErrorPage(app, t('schedule.history.error'));
    });
}
