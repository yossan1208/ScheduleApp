import './form.css';
import { admin, type AdminUser } from '../../../../../api/admin';
import { navigate } from '../../../../../utils/router';
import { t } from '../../../../../utils/i18n';

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function roleBadgeText(role: number): string {
  if (role === 0) return t('admin.users.role.admin');
  if (role === 1) return t('admin.users.role.gl');
  return t('admin.users.role.general');
}

export async function mount(app: HTMLElement): Promise<void> {
  if (localStorage.getItem('role') !== '0') {
    navigate('/settings');
    return;
  }

  app.innerHTML = `
    <div class="admin-group-page">
      <div class="admin-group-header">
        <button class="admin-group-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="admin-group-title">${t('admin.group.form.title')}</h1>
      </div>
      <div class="admin-group-body">
        <div class="admin-group-field">
          <label for="g-name">${t('admin.group.form.name')}</label>
          <input class="admin-group-input" type="text" id="g-name" placeholder="例: チームA" />
        </div>
        <div class="admin-group-field">
          <p class="admin-group-member-label">${t('admin.group.form.membersLabel')}</p>
          <div id="member-list"><p class="admin-group-empty">${t('common.loading')}</p></div>
          <p class="admin-group-member-hint">${t('admin.group.form.hint')}</p>
        </div>
      </div>
      <p class="admin-group-error" id="group-error"></p>
      <button class="admin-group-submit-btn" id="btn-submit">${t('admin.group.form.submit')}</button>
    </div>
  `;

  const nameInput  = app.querySelector<HTMLInputElement>('#g-name')!;
  const memberList = app.querySelector<HTMLElement>('#member-list')!;
  const errorEl    = app.querySelector<HTMLElement>('#group-error')!;
  const submitBtn  = app.querySelector<HTMLButtonElement>('#btn-submit')!;

  app.querySelector('#btn-back')!.addEventListener('click', () => navigate('/settings/admin'));

  // 未所属ユーザー取得
  const result = await admin.getUsers(true);
  let ungroupedUsers: AdminUser[] = [];

  if (!result.success || !result.data || result.data.length === 0) {
    memberList.innerHTML = `<p class="admin-group-empty">${t('admin.group.form.noUsers')}</p>`;
    submitBtn.disabled = true;
  } else {
    ungroupedUsers = result.data;
    memberList.innerHTML = `
      <div class="admin-group-members">
        ${ungroupedUsers.map(u => `
          <label class="admin-group-member-row">
            <input type="checkbox" data-uid="${u.userId}" />
            <span class="admin-group-member-name">${escHtml(u.name)}</span>
            <span class="admin-group-member-badge">${escHtml(roleBadgeText(u.role))}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  submitBtn.addEventListener('click', async () => {
    const groupName = nameInput.value.trim();
    const checked   = Array.from(
      app.querySelectorAll<HTMLInputElement>('input[data-uid]:checked')
    ).map(cb => parseInt(cb.dataset.uid!, 10));

    if (!groupName) {
      errorEl.textContent = t('admin.group.form.error.noName');
      return;
    }
    if (checked.length === 0) {
      errorEl.textContent = t('admin.group.form.error.noMember');
      return;
    }

    submitBtn.disabled = true;
    errorEl.textContent = '';

    const r = await admin.createGroup({ name: groupName, userIds: checked });

    if (!r.success) {
      const code = r.error?.code;
      errorEl.textContent = code === 'ADMIN_GROUP_USER_REQUIRED'
        ? t('admin.group.form.error.groupUserRequired')
        : t('admin.group.form.error.save');
      submitBtn.disabled = false;
      return;
    }

    navigate('/settings/admin', true);
  });
}
