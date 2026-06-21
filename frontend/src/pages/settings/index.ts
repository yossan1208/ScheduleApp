import './settings.css';
import { navigate } from '../../utils/router';

export function mount(app: HTMLElement): void {
  const role = localStorage.getItem('role');
  const isAdmin = role === '0';

  const adminItem = isAdmin
    ? `<li class="settings-menu-item settings-menu-item--disabled" id="item-admin">
        <span class="settings-menu-label">管理者用設定</span>
        <span class="settings-menu-arrow">›</span>
       </li>`
    : '';

  app.innerHTML = `
    <div class="settings-page">
      <div class="settings-header">
        <button class="settings-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="settings-title">Settings</h1>
      </div>
      <ul class="settings-menu">
        <li class="settings-menu-item" id="item-profile">
          <span class="settings-menu-label">個人用設定</span>
          <span class="settings-menu-arrow">›</span>
        </li>
        <li class="settings-menu-item" id="item-notifications">
          <span class="settings-menu-label">通知設定</span>
          <span class="settings-menu-arrow">›</span>
        </li>
        <li class="settings-menu-item" id="item-genres">
          <span class="settings-menu-label">ジャンル一覧</span>
          <span class="settings-menu-arrow">›</span>
        </li>
        <li class="settings-menu-item" id="item-password">
          <span class="settings-menu-label">パスワード設定</span>
          <span class="settings-menu-arrow">›</span>
        </li>
        ${adminItem}
      </ul>
    </div>
  `;

  app.querySelector('#btn-back')!.addEventListener('click', () => navigate('/home'));
  app.querySelector('#item-profile')!.addEventListener('click', () => navigate('/settings/profile'));
  app.querySelector('#item-notifications')!.addEventListener('click', () => navigate('/settings/notifications'));
  app.querySelector('#item-genres')!.addEventListener('click', () => navigate('/settings/genres'));
  app.querySelector('#item-password')!.addEventListener('click', () => navigate('/settings/password'));

  // TODO: SCR-50 — 管理者用設定は現時点では何もしない
}
