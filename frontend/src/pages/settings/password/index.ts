import { navigate } from '../../../utils/router';
import { userSettings } from '../../../api/settings';
import './password.css';

export async function mount(app: HTMLElement): Promise<void> {
  app.innerHTML = `
    <div class="password-page">
      <div class="password-header">
        <button class="password-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="password-title">パスワード設定</h1>
      </div>
      <div class="password-form-wrap">
        <div class="password-field">
          <input
            type="password"
            id="input-current"
            class="password-input"
            placeholder="古いパスワードを入力"
            autocomplete="current-password"
          />
        </div>
        <div class="password-field">
          <input
            type="password"
            id="input-new"
            class="password-input"
            placeholder="新しいパスワードを入力"
            autocomplete="new-password"
          />
        </div>
        <div class="password-field">
          <input
            type="password"
            id="input-confirm"
            class="password-input"
            placeholder="確認用"
            autocomplete="new-password"
          />
        </div>
        <p class="password-error" id="error-msg" aria-live="polite"></p>
        <button class="password-submit-btn" id="btn-submit">設定する</button>
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
      errorMsg.textContent = 'すべてのフィールドを入力してください';
      return;
    }
    if (newPassword !== confirmPassword) {
      errorMsg.textContent = '新しいパスワードと確認用が一致しません';
      return;
    }

    btnSubmit.disabled = true;
    try {
      const result = await userSettings.changePassword({ currentPassword, newPassword, confirmPassword });
      if (result.success) {
        alert('パスワードを変更しました');
        navigate('/settings');
      } else {
        const code = result.error?.code ?? '';
        if (code === 'USER_PASSWORD_MISMATCH') {
          errorMsg.textContent = '現在のパスワードが正しくありません';
        } else if (code === 'USER_PASSWORD_CONFIRM_MISMATCH') {
          errorMsg.textContent = '新しいパスワードと確認用が一致しません';
        } else {
          errorMsg.textContent = result.error?.message ?? 'エラーが発生しました';
        }
      }
    } catch {
      errorMsg.textContent = '通信エラーが発生しました';
    } finally {
      btnSubmit.disabled = false;
    }
  });
}
