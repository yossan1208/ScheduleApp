import { navigate } from '../../../utils/router';
import { userSettings, colors } from '../../../api/settings';
import type { ColorItem } from '../../../api/settings';
import { genres } from '../../../api/genres';
import { ColorCarousel } from '../../../components/color-carousel';
import type { CarouselColor } from '../../../components/color-carousel';
import './profile.css';

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  let personalCarousel: ColorCarousel | null = null;
  let themeCarousel: ColorCarousel | null = null;

  btnBack.addEventListener('click', () => {
    personalCarousel?.destroy();
    themeCarousel?.destroy();
    navigate('/settings');
  });

  // Fetch profile, colors, genres in parallel
  let colorItems: ColorItem[] = [];
  let genreUsedColorIds = new Set<number>();
  let prefillName = '';
  let prefillPersonalColorId: number | null = null;
  let prefillThemeColorId: number | null = null;
  let prefillLanguage = '';

  try {
    const [profileResult, colorsResult, genresResult] = await Promise.all([
      userSettings.getProfile(),
      colors.getAll(),
      genres.getGenres(),
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
    prefillLanguage = profileResult.data.language;
    colorItems = colorsResult.data;

    // 個人カラー選択時: ジャンルが使用中の色はグレーアウト
    if (genresResult.success && genresResult.data) {
      genreUsedColorIds = new Set(genresResult.data.map((g) => g.colorId));
    }
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
        <div id="personal-swatches"></div>
      </div>

      <div class="profile-form-field">
        <label class="profile-form-label">
          テーマカラー <span class="profile-form-required">*</span>
        </label>
        <div id="theme-swatches"></div>
      </div>

      <p class="profile-form-error" id="form-error" style="display:none;"></p>

      <button type="submit" class="profile-form-save-btn" id="btn-save">設定する</button>

    </form>
  `;

  const errorEl = profileBody.querySelector<HTMLParagraphElement>('#form-error')!;

  // Personal color carousel (disabled = genre-used colors)
  const personalCarouselColors: CarouselColor[] = colorItems.map((c) => ({
    colorId: c.colorId,
    hexCode: c.hexCode,
    displayName: c.displayName,
    disabled: genreUsedColorIds.has(c.colorId),
  }));
  personalCarousel = new ColorCarousel({
    container: profileBody.querySelector<HTMLDivElement>('#personal-swatches')!,
    colors: personalCarouselColors,
    selectedColorId: selectedPersonalColorId,
    onChange: (colorId) => { selectedPersonalColorId = colorId; },
  });

  // Theme color carousel (no restrictions)
  const themeCarouselColors: CarouselColor[] = colorItems.map((c) => ({
    colorId: c.colorId,
    hexCode: c.hexCode,
    displayName: c.displayName,
  }));
  themeCarousel = new ColorCarousel({
    container: profileBody.querySelector<HTMLDivElement>('#theme-swatches')!,
    colors: themeCarouselColors,
    selectedColorId: selectedThemeColorId,
    onChange: (colorId) => { selectedThemeColorId = colorId; },
  });

  function showError(msg: string): void {
    errorEl.textContent = msg;
    errorEl.style.display = '';
  }

  function hideError(): void {
    errorEl.style.display = 'none';
  }

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
        language: prefillLanguage,
      });

      if (result.success && result.data) {
        document.documentElement.style.setProperty('--theme-color', result.data.themeColorHex);
        personalCarousel?.destroy();
        themeCarousel?.destroy();
        alert('設定を保存しました');
        navigate('/settings');
      } else {
        const code = result.error?.code;
        if (code === 'USER_COLOR_CONFLICT') {
          showError('選択した個人カラーは、すでにジャンルで使用されています');
        } else {
          showError(result.error?.message ?? '更新に失敗しました');
        }
      }
    } catch {
      showError('通信エラーが発生しました');
    } finally {
      btnSave.disabled = false;
    }
  });
}
