import './detail.css';
import { schedules } from '../../../api/schedules';

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

      const s       = result.data;
      const bgColor = s.genre?.colorHex ?? '#5c9ad6';
      const dark    = isDarkColor(bgColor);
      const text    = dark ? '#ffffff'               : '#1a1a1a';
      const sub     = dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)';
      const badge   = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
      const btn     = dark ? 'rgba(255,255,255,0.85)': 'rgba(0,0,0,0.65)';

      const timeStr = s.startTime
        ? `${s.startTime.slice(0, 5)}${s.endTime ? ` - ${s.endTime.slice(0, 5)}` : ''}`
        : '終日';

      const storedId     = parseInt(localStorage.getItem('userId') ?? '0', 10);
      const creatorLabel = s.creatorId === storedId ? '自分' : '他のメンバー';

      const memoBlock = s.detail ? `
        <div class="detail-section detail-memo">
          <p class="detail-memo-text" style="color:${sub}">${s.detail.replace(/\n/g, '<br>')}</p>
        </div>
      ` : '';

      const genreBadge = s.genre ? `
        <span class="detail-genre-badge" style="background:${badge}; color:${text}">
          ${s.genre.name}
        </span>
      ` : '';

      app.innerHTML = `
        <div class="detail-page" style="background:${bgColor}; color:${text}">
          <div class="detail-header">
            <button class="detail-nav-btn" id="btn-back" style="color:${btn}" aria-label="戻る">←</button>
            <button class="detail-nav-btn" id="btn-edit" style="color:${btn}" aria-label="編集">✏️</button>
          </div>

          <div class="detail-body">
            <h1 class="detail-title">${s.title}</h1>
            <p class="detail-time" style="color:${sub}">${timeStr}</p>
            <p class="detail-date" style="color:${sub}">${formatDate(s.date)}</p>

            ${genreBadge}

            <div class="detail-section">
              <span class="detail-icon" style="color:${sub}">🔔</span>
              <span class="detail-info" style="color:${text}">${s.notificationTime.slice(0, 5)}</span>
            </div>

            <div class="detail-section">
              <span class="detail-label" style="color:${sub}">With</span>
              <div class="detail-with-row">
                <div class="detail-avatar" style="background:${badge}; color:${text}">👤</div>
                <span class="detail-info" style="color:${text}">${creatorLabel}</span>
              </div>
            </div>

            ${memoBlock}
          </div>
        </div>
      `;

      app.querySelector('#btn-back')!
        .addEventListener('click', () => history.back());

      // SCR-22 未実装のため何もしない
      app.querySelector('#btn-edit')!
        .addEventListener('click', () => {});
    })
    .catch(() => {
      app.innerHTML = `<div class="detail-error">取得に失敗しました</div>`;
    });
}
