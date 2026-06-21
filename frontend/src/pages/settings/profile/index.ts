import { navigate } from '../../../utils/router';
import { userSettings, colors } from '../../../api/settings';
import type { ColorItem } from '../../../api/settings';
import './profile.css';

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

function renderSwatches(
  colorItems: ColorItem[],
  selectedColorId: number | null,
  dataType: 'personal' | 'theme'
): string {
  return `
    <div class="color-swatches" data-type="${dataType}">
      ${colorItems
        .map(
          (c) => `
        <button
          type="button"
          class="color-swatch${selectedColorId === c.colorId ? ' selected' : ''}"
          data-color-id="${c.colorId}"
          style="background-color: ${safeColor(c.hexCode)};"
          aria-label="${escHtml(c.displayName)}"
        ></button>`
        )
        .join('')}
    </div>
  `;
}

export async function mount(app: HTMLElement): Promise<void> {
  app.innerHTML = `
    <div class="profile-page">
      <div class="profile-header">
        <button class="profile-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="profile-title">個人設定</h1>
      </div>
      <p class="profile-loading" id="loading-msg">読み込み中…</p>
      <div class="profile-body" id="profile-body" style="display:none;"></div>
    </div>
  `;

  const btnBack = app.querySelector<HTMLButtonElement>('#btn-back')!;
  const loadingMsg = app.querySelector<HTMLParagraphElement>('#loading-msg')!;
  const profileBody = app.querySelector<HTMLDivElement>('#profile-body')!;

  btnBack.addEventListener('click', () => navigate('/settings'));

  // Fetch profile and colors in parallel
  let colorItems: ColorItem[] = [];
  let prefillName = '';
  let prefillPersonalColorId: number | null = null;
  let prefillThemeColorId: number | null = null;

  try {
    const [profileResult, colorsResult] = await Promise.all([
      userSettings.getProfile(),
      colors.getAll(),
    ]);

    if (!profileResult.success || !profileResult.data) {
      loadingMsg.textContent = 'プロフィールの取得に失敗しました';
      return;
    }
    if (!colorsResult.success || !colorsResult.data) {
      loadingMsg.textContent = 'カラーデータの取得に失敗しました';
      return;
    }

    prefillName = profileResult.data.name;
    prefillPersonalColorId = profileResult.data.personalColorId;
    prefillThemeColorId = profileResult.data.themeColorId;
    colorItems = colorsResult.data;
  } catch {
    loadingMsg.textContent = 'データの取得に失敗しました';
    return;
  }

  let selectedPersonalColorId: number | null = prefillPersonalColorId;
  let selectedThemeColorId: number | null = prefillThemeColorId;

  // Render form
  loadingMsg.style.display = 'none';
  profileBody.style.display = '';
  profileBody.innerHTML = `
    <form class="profile-form" id="profile-form" novalidate>

      <div class="profile-form-field">
        <label class="profile-form-label" for="input-name">
          名前 <span class="profile-form-required">*</span>
        </label>
        <input
          type="text"
          id="input-name"
          class="profile-form-input"
          maxlength="50"
          placeholder="名前を入力"
          value="${escHtml(prefillName)}"
        />
      </div>

      <div class="profile-form-field">
        <label class="profile-form-label">
          個人カラー <span class="profile-form-required">*</span>
        </label>
        <div id="personal-swatches">
          ${renderSwatches(colorItems, selectedPersonalColorId, 'personal')}
        </div>
      </div>

      <div class="profile-form-field">
        <label class="profile-form-label">
          テーマカラー <span class="profile-form-required">*</span>
        </label>
        <div id="theme-swatches">
          ${renderSwatches(colorItems, selectedThemeColorId, 'theme')}
        </div>
      </div>

      <p class="profile-form-error" id="form-error" style="display:none;"></p>

      <button type="submit" class="profile-form-save-btn" id="btn-save">設定する</button>

    </form>
  `;

  const personalSwatches = profileBody.querySelector<HTMLDivElement>('#personal-swatches')!;
  const themeSwatches = profileBody.querySelector<HTMLDivElement>('#theme-swatches')!;
  const errorEl = profileBody.querySelector<HTMLParagraphElement>('#form-error')!;

  function showError(msg: string): void {
    errorEl.textContent = msg;
    errorEl.style.display = '';
  }

  function hideError(): void {
    errorEl.style.display = 'none';
  }

  // Swatch click via event delegation on personal swatches
  personalSwatches.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.color-swatch');
    if (!btn) return;
    const colorId = parseInt(btn.dataset.colorId ?? '', 10);
    if (isNaN(colorId)) return;
    selectedPersonalColorId = colorId;
    personalSwatches.innerHTML = renderSwatches(colorItems, selectedPersonalColorId, 'personal');
  });

  // Swatch click via event delegation on theme swatches
  themeSwatches.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.color-swatch');
    if (!btn) return;
    const colorId = parseInt(btn.dataset.colorId ?? '', 10);
    if (isNaN(colorId)) return;
    selectedThemeColorId = colorId;
    themeSwatches.innerHTML = renderSwatches(colorItems, selectedThemeColorId, 'theme');
  });

  // Form submit
  const form = profileBody.querySelector<HTMLFormElement>('#profile-form')!;
  const btnSave = profileBody.querySelector<HTMLButtonElement>('#btn-save')!;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const nameInput = profileBody.querySelector<HTMLInputElement>('#input-name')!;
    const name = nameInput.value.trim();

    // Validation
    if (!name) {
      showError('名前を入力してください');
      nameInput.focus();
      return;
    }
    if (selectedPersonalColorId === null) {
      showError('個人カラーを選択してください');
      return;
    }
    if (selectedThemeColorId === null) {
      showError('テーマカラーを選択してください');
      return;
    }

    btnSave.disabled = true;

    try {
      const result = await userSettings.updateProfile({
        name,
        personalColorId: selectedPersonalColorId,
        themeColorId: selectedThemeColorId,
      });

      if (result.success && result.data) {
        document.documentElement.style.setProperty('--theme-color', result.data.themeColorHex);
        alert('設定を保存しました');
        navigate('/settings');
      } else {
        showError(result.error?.message ?? '更新に失敗しました');
      }
    } catch {
      showError('通信エラーが発生しました');
    } finally {
      btnSave.disabled = false;
    }
  });
}
