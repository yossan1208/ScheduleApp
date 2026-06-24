import './form.css';
import { admin } from '../../../../../api/admin';
import { navigate } from '../../../../../utils/router';
import { t } from '../../../../../utils/i18n';

export async function mount(app: HTMLElement): Promise<void> {
  if (localStorage.getItem('role') !== '0') {
    navigate('/settings');
    return;
  }

  app.innerHTML = `
    <div class="admin-form-page">
      <div class="admin-form-header">
        <button class="admin-form-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="admin-form-title">${t('admin.user.form.title')}</h1>
      </div>
      <div class="admin-form-body">
        <div class="admin-form-field">
          <label for="f-loginid">LoginId</label>
          <input class="admin-form-input" type="text" id="f-loginid" placeholder="例: tanaka01" autocomplete="off" />
        </div>
        <div class="admin-form-field">
          <label for="f-name">${t('admin.user.form.name')}</label>
          <input class="admin-form-input" type="text" id="f-name" placeholder="田中 太郎" />
        </div>
        <div class="admin-form-field">
          <label for="f-password">${t('admin.user.form.password')}</label>
          <input class="admin-form-input" type="password" id="f-password" placeholder="${t('admin.user.form.password')}" autocomplete="new-password" />
        </div>
        <div class="admin-form-field">
          <label>${t('admin.user.form.role')}</label>
          <div class="admin-role-options">
            <label class="admin-role-option">
              <input type="radio" name="role" value="0" /> ${t('admin.users.role.admin')}
            </label>
            <label class="admin-role-option">
              <input type="radio" name="role" value="1" /> ${t('admin.users.role.gl')}
            </label>
            <label class="admin-role-option">
              <input type="radio" name="role" value="2" checked /> ${t('admin.users.role.general')}
            </label>
          </div>
        </div>
      </div>
      <p class="admin-form-error" id="form-error"></p>
      <button class="admin-form-submit-btn" id="btn-submit">${t('admin.user.form.submit')}</button>
    </div>
  `;

  const loginIdInput = app.querySelector<HTMLInputElement>('#f-loginid')!;
  const nameInput    = app.querySelector<HTMLInputElement>('#f-name')!;
  const passwordInput= app.querySelector<HTMLInputElement>('#f-password')!;
  const errorEl      = app.querySelector<HTMLElement>('#form-error')!;
  const submitBtn    = app.querySelector<HTMLButtonElement>('#btn-submit')!;

  app.querySelector('#btn-back')!.addEventListener('click', () => navigate('/settings/admin/users'));

  submitBtn.addEventListener('click', async () => {
    const loginId  = loginIdInput.value.trim();
    const name     = nameInput.value.trim();
    const password = passwordInput.value;
    const roleVal  = (app.querySelector<HTMLInputElement>('input[name="role"]:checked')?.value) ?? '2';

    if (!loginId || !name || !password) {
      errorEl.textContent = t('admin.user.form.error.required');
      return;
    }

    submitBtn.disabled = true;
    errorEl.textContent = '';

    const result = await admin.createUser({ loginId, name, password, role: parseInt(roleVal, 10) });

    if (!result.success) {
      const code = result.error?.code;
      errorEl.textContent = code === 'ADMIN_LOGIN_ID_CONFLICT'
        ? t('admin.user.form.error.loginIdConflict')
        : t('admin.user.form.error.generic');
      submitBtn.disabled = false;
      return;
    }

    navigate('/settings/admin/users', true);
  });
}
