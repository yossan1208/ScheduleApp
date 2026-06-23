import './users.css';
import { admin, type AdminUser } from '../../../../api/admin';
import { navigate } from '../../../../utils/router';

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function roleBadge(role: number): string {
  if (role === 0) return '<span class="admin-role-badge admin-role-badge--admin">管理者</span>';
  if (role === 1) return '<span class="admin-role-badge admin-role-badge--gl">GL</span>';
  return '<span class="admin-role-badge">一般</span>';
}

function userRowHtml(u: AdminUser): string {
  const inactive = !u.isActive;
  const actionHtml = inactive
    ? '<span class="admin-inactive-label">無効化済み</span>'
    : `<button class="admin-deactivate-btn" data-id="${u.userId}" data-name="${escHtml(u.name)}">無効化</button>`;

  return `
    <div class="admin-user-row${inactive ? ' admin-user-row--inactive' : ''}">
      <div class="admin-user-info">
        <span class="admin-user-name">${escHtml(u.name)}</span>
        <span class="admin-user-login">${escHtml(u.loginId)}</span>
      </div>
      ${roleBadge(u.role)}
      ${actionHtml}
    </div>
  `;
}

async function loadUsers(listEl: HTMLElement): Promise<void> {
  listEl.innerHTML = '<p class="admin-users-empty">読み込み中…</p>';

  const result = await admin.getUsers();
  if (!result.success || !result.data) {
    listEl.innerHTML = '<p class="admin-users-empty">ユーザーを取得できませんでした</p>';
    return;
  }

  const users = result.data;
  if (users.length === 0) {
    listEl.innerHTML = '<p class="admin-users-empty">ユーザーがいません</p>';
    return;
  }

  listEl.innerHTML = `<div class="admin-users-list">${users.map(userRowHtml).join('')}</div>`;

  listEl.querySelectorAll<HTMLButtonElement>('.admin-deactivate-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id   = parseInt(btn.dataset.id!, 10);
      const name = btn.dataset.name!;
      if (!confirm(`${name} を無効化しますか？`)) return;
      btn.disabled = true;
      const r = await admin.deactivate(id);
      if (r.success) {
        await loadUsers(listEl);
      } else {
        alert('無効化に失敗しました');
        btn.disabled = false;
      }
    });
  });
}

export async function mount(app: HTMLElement): Promise<void> {
  if (localStorage.getItem('role') !== '0') {
    navigate('/settings');
    return;
  }

  app.innerHTML = `
    <div class="admin-users-page">
      <div class="admin-users-header">
        <button class="admin-users-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="admin-users-title">ユーザー管理</h1>
        <button class="admin-users-new-btn" id="btn-new">＋ 新規</button>
      </div>
      <div id="users-list"></div>
    </div>
  `;

  app.querySelector('#btn-back')!.addEventListener('click', () => navigate('/settings/admin'));
  app.querySelector('#btn-new')!.addEventListener('click', () => navigate('/settings/admin/users/new'));

  await loadUsers(app.querySelector<HTMLElement>('#users-list')!);
}
