import './detail.css';
import { schedules } from '../../../api/schedules';
import { navigate } from '../../../utils/router';

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

export function mount(app: HTMLElement): void {
  const parts = location.pathname.split('/');
  const id    = parseInt(parts[parts.length - 1], 10);

  if (!id || isNaN(id)) {
    app.innerHTML = `<div class="detail-error">予定が見つかりません</div>`;
    return;
  }

  app.innerHTML = `<div class="detail-loading">読み込み中…</div>`;

  schedules.getScheduleById(id)
    .then(result => {
      if (!result.success || !result.data) {
        app.innerHTML = `<div class="detail-error">予定が見つかりません</div>`;
        return;
      }

      const s = result.data;

      const timeStr = s.startTime
        ? `${s.startTime.slice(0, 5)}${s.endTime ? ` - ${s.endTime.slice(0, 5)}` : ''}`
        : '終日';

      const storedId     = parseInt(localStorage.getItem('currentUserId') ?? '0', 10);
      const creatorLabel = s.creatorId === storedId ? '自分' : '他のメンバー';

      const memoBlock = s.detail ? `
        <div class="detail-section detail-memo">
          <p class="detail-memo-text">${s.detail.replace(/\n/g, '<br>')}</p>
        </div>
      ` : '';

      const genreBadge = s.genre ? `
        <span class="detail-genre-badge" style="background:${s.genre.colorHex}; color:${isDarkColor(s.genre.colorHex) ? '#ffffff' : '#1a1a1a'}">
          ${s.genre.name}
        </span>
      ` : '';

      app.innerHTML = `
        <div class="detail-page">
          <div class="detail-header">
            <button class="detail-nav-btn" id="btn-back" aria-label="戻る">←</button>
            <button class="detail-nav-btn" id="btn-edit" aria-label="編集">✏️</button>
          </div>

          <div class="detail-body">
            <h1 class="detail-title">${s.title}</h1>
            <p class="detail-time">${timeStr}</p>
            <p class="detail-date">${formatDate(s.date)}</p>

            ${genreBadge}

            <div class="detail-section">
              <span class="detail-icon">🔔</span>
              <span class="detail-info">${s.notificationTime.slice(0, 5)}</span>
            </div>

            <div class="detail-section">
              <span class="detail-label">With</span>
              <div class="detail-with-row">
                <div class="detail-avatar">👤</div>
                <span class="detail-info">${creatorLabel}</span>
              </div>
            </div>

            ${memoBlock}
          </div>
        </div>
      `;

      app.querySelector('#btn-back')!
        .addEventListener('click', () => history.back());

      app.querySelector('#btn-edit')!
        .addEventListener('click', () => navigate(`/schedule/${id}/edit`));
    })
    .catch(() => {
      app.innerHTML = `<div class="detail-error">取得に失敗しました</div>`;
    });
}
