import './form.css';
import { admin } from '../../../../../api/admin';
import { navigate } from '../../../../../utils/router';

export async function mount(app: HTMLElement): Promise<void> {
  if (localStorage.getItem('role') !== '0') {
    navigate('/settings');
    return;
  }

  app.innerHTML = `
    <div class="admin-form-page">
      <div class="admin-form-header">
        <button class="admin-form-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="admin-form-title">アカウント作成</h1>
      </div>
      <div class="admin-form-body">
        <div class="admin-form-field">
          <label for="f-loginid">LoginId</label>
          <input class="admin-form-input" type="text" id="f-loginid" placeholder="例: tanaka01" autocomplete="off" />
        </div>
        <div class="admin-form-field">
          <label for="f-name">名前</label>
          <input class="admin-form-input" type="text" id="f-name" placeholder="田中 太郎" />
        </div>
        <div class="admin-form-field">
          <label for="f-password">初期パスワード</label>
          <input class="admin-form-input" type="password" id="f-password" placeholder="初期パスワード" autocomplete="new-password" />
        </div>
        <div class="admin-form-field">
          <label>ロール</label>
          <div class="admin-role-options">
            <label class="admin-role-option">
              <input type="radio" name="role" value="0" /> 管理者
            </label>
            <label class="admin-role-option">
              <input type="radio" name="role" value="1" /> GL
            </label>
            <label class="admin-role-option">
              <input type="radio" name="role" value="2" checked /> 一般
            </label>
          </div>
        </div>
      </div>
      <p class="admin-form-error" id="form-error"></p>
      <button class="admin-form-submit-btn" id="btn-submit">作成する</button>
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
      errorEl.textContent = 'すべての項目を入力してください';
      return;
    }

    submitBtn.disabled = true;
    errorEl.textContent = '';

    const result = await admin.createUser({ loginId, name, password, role: parseInt(roleVal, 10) });

    if (!result.success) {
      const code = result.error?.code;
      errorEl.textContent = code === 'ADMIN_LOGIN_ID_CONFLICT'
        ? 'このLoginIdはすでに使われています'
        : '作成に失敗しました';
      submitBtn.disabled = false;
      return;
    }

    navigate('/settings/admin/users', true);
  });
}
