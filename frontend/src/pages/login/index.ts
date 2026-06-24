import './login.css';
import { auth } from '../../api/auth';
import { navigate } from '../../utils/router';
import { applyThemeColor } from '../../utils/theme';

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'IDまたはパスワードが違います',
  AUTH_ACCOUNT_DISABLED:    'アカウントが無効です',
  AUTH_NO_GROUP:            'グループに加入してください',
};

export function mount(app: HTMLElement): void {
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <h1>ログイン</h1>
        <form id="login-form">
          <div class="form-group">
            <label for="login-id">ID</label>
            <input id="login-id" type="text" autocomplete="username" required />
          </div>
          <div class="form-group">
            <label for="password">パスワード</label>
            <input id="password" type="password" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn btn-primary">ログイン</button>
          <p id="error-msg" class="error-message"></p>
        </form>
      </div>
    </div>
  `;

  const form     = app.querySelector<HTMLFormElement>('#login-form')!;
  const loginIdEl = app.querySelector<HTMLInputElement>('#login-id')!;
  const passwordEl = app.querySelector<HTMLInputElement>('#password')!;
  const errorEl  = app.querySelector<HTMLParagraphElement>('#error-msg')!;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const result = await auth.login({
      loginId:  loginIdEl.value,
      password: passwordEl.value,
    });

    if (!result.success || !result.data) {
      const code = result.error?.code ?? '';
      errorEl.textContent = ERROR_MESSAGES[code] ?? 'ログインに失敗しました';
      return;
    }

    applyThemeColor(result.data.themeColorHex);
    localStorage.setItem('themeColorHex', result.data.themeColorHex);
    localStorage.setItem('currentUserId', String(result.data.userId));
    localStorage.setItem('role', String(result.data.role));
    localStorage.setItem('language', result.data.language);

    navigate('/home');
  });
}
