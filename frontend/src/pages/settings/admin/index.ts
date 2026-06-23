import '../settings.css';
import { navigate } from '../../../utils/router';

export async function mount(app: HTMLElement): Promise<void> {
  if (localStorage.getItem('role') !== '0') {
    navigate('/settings');
    return;
  }

  app.innerHTML = `
    <div class="settings-page">
      <div class="settings-header">
        <button class="settings-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="settings-title">管理者設定</h1>
      </div>
      <ul class="settings-menu">
        <li class="settings-menu-item" id="item-users">
          <span class="settings-menu-label">ユーザー管理</span>
          <span class="settings-menu-arrow">›</span>
        </li>
        <li class="settings-menu-item" id="item-groups">
          <span class="settings-menu-label">グループ作成</span>
          <span class="settings-menu-arrow">›</span>
        </li>
      </ul>
    </div>
  `;

  app.querySelector('#btn-back')!.addEventListener('click', () => navigate('/settings'));
  app.querySelector('#item-users')!.addEventListener('click', () => navigate('/settings/admin/users'));
  app.querySelector('#item-groups')!.addEventListener('click', () => navigate('/settings/admin/groups/new'));
}
