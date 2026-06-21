import { navigate } from '../../../utils/router';
import { notifications } from '../../../api/settings';
import type { NotificationSetting } from '../../../api/settings';
import './notifications.css';

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeColor(hex: string): string {
  return /^#[0-9a-fA-F]{3,6}$/.test(hex) ? hex : '#ccc';
}

function renderRows(settings: NotificationSetting[]): string {
  if (settings.length === 0) {
    return '<p class="notifications-empty">ジャンルがまだ作成されていません</p>';
  }
  return settings
    .map(
      (s) => `
    <li class="notifications-row" data-genre-id="${s.genreId}">
      <span class="notifications-dot" style="background-color:${safeColor(s.colorHex)};"></span>
      <span class="notifications-genre-name">${escHtml(s.genreName)}</span>
      <label class="toggle-switch" aria-label="${escHtml(s.genreName)} 通知">
        <input
          type="checkbox"
          ${s.isEnabled ? 'checked' : ''}
          data-genre-id="${s.genreId}"
        >
        <span class="toggle-slider"></span>
      </label>
    </li>`
    )
    .join('');
}

export async function mount(app: HTMLElement): Promise<void> {
  app.innerHTML = `
    <div class="notifications-page">
      <div class="notifications-header">
        <button class="notifications-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="notifications-title">通知設定</h1>
      </div>
      <p class="notifications-loading" id="loading-msg">読み込み中…</p>
      <ul class="notifications-list" id="notifications-list" style="display:none;"></ul>
    </div>
  `;

  const btnBack = app.querySelector<HTMLButtonElement>('#btn-back')!;
  const loadingMsg = app.querySelector<HTMLParagraphElement>('#loading-msg')!;
  const list = app.querySelector<HTMLUListElement>('#notifications-list')!;

  btnBack.addEventListener('click', () => navigate('/settings'));

  // Event delegation for toggle changes
  app.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    if (input.type !== 'checkbox') return;
    const genreId = parseInt(input.dataset.genreId!, 10);
    if (isNaN(genreId)) return;
    input.disabled = true;
    try {
      await notifications.updateSetting(genreId, {
        isEnabled: input.checked,
        customNotificationMinutes: null,
      });
    } catch {
      // Revert toggle on error
      input.checked = !input.checked;
    } finally {
      input.disabled = false;
    }
  });

  try {
    const result = await notifications.getSettings();
    loadingMsg.style.display = 'none';
    list.style.display = '';
    if (result.success && result.data) {
      list.innerHTML = renderRows(result.data);
    } else {
      list.innerHTML = '<p class="notifications-empty">データの取得に失敗しました</p>';
    }
  } catch {
    loadingMsg.textContent = 'データの取得に失敗しました';
  }
}
