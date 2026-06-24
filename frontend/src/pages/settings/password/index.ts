import { navigate } from '../../../utils/router';
import { userSettings } from '../../../api/settings';
import { t } from '../../../utils/i18n';
import './password.css';

export async function mount(app: HTMLElement): Promise<void> {
  app.innerHTML = `
    <div class="password-page">
      <div class="password-header">
        <button class="password-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="password-title">${t('password.title')}</h1>
      </div>
      <div class="password-form-wrap">
        <div class="password-field">
          <input
            type="password"
            id="input-current"
            class="password-input"
            placeholder="${t('password.placeholder.current')}"
            autocomplete="current-password"
          />
        </div>
        <div class="password-field">
          <input
            type="password"
            id="input-new"
            class="password-input"
            placeholder="${t('password.placeholder.new')}"
            autocomplete="new-password"
          />
        </div>
        <div class="password-field">
          <input
            type="password"
            id="input-confirm"
            class="password-input"
            placeholder="${t('password.placeholder.confirm')}"
            autocomplete="new-password"
          />
        </div>
        <p class="password-error" id="error-msg" aria-live="polite"></p>
        <button class="password-submit-btn" id="btn-submit">${t('password.save')}</button>
      </div>
    </div>
  `;

  const btnBack    = app.querySelector<HTMLButtonElement>('#btn-back')!;
  const inputCurrent = app.querySelector<HTMLInputElement>('#input-current')!;
  const inputNew     = app.querySelector<HTMLInputElement>('#input-new')!;
  const inputConfirm = app.querySelector<HTMLInputElement>('#input-confirm')!;
  const errorMsg   = app.querySelector<HTMLParagraphElement>('#error-msg')!;
  const btnSubmit  = app.querySelector<HTMLButtonElement>('#btn-submit')!;

  btnBack.addEventListener('click', () => navigate('/settings'));

  btnSubmit.addEventListener('click', async () => {
    errorMsg.textContent = '';

    const currentPassword = inputCurrent.value;
    const newPassword     = inputNew.value;
    const confirmPassword = inputConfirm.value;

    // クライアント側バリデーション
    if (!currentPassword || !newPassword || !confirmPassword) {
      errorMsg.textContent = t('password.error.empty');
      return;
    }
    if (newPassword !== confirmPassword) {
      errorMsg.textContent = t('password.error.confirmMismatch');
      return;
    }

    btnSubmit.disabled = true;
    try {
      const result = await userSettings.changePassword({ currentPassword, newPassword, confirmPassword });
      if (result.success) {
        alert(t('password.saved'));
        navigate('/settings');
      } else {
        const code = result.error?.code ?? '';
        if (code === 'USER_PASSWORD_MISMATCH') {
          errorMsg.textContent = t('password.error.mismatch');
        } else if (code === 'USER_PASSWORD_CONFIRM_MISMATCH') {
          errorMsg.textContent = t('password.error.confirmMismatch');
        } else {
          errorMsg.textContent = result.error?.message ?? t('password.error.generic');
        }
      }
    } catch {
      errorMsg.textContent = t('common.error.network');
    } finally {
      btnSubmit.disabled = false;
    }
  });
}
