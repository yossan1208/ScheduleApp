import { navigate } from '../../../utils/router';
import { userSettings, colors } from '../../../api/settings';
import type { ColorItem } from '../../../api/settings';
import { genres } from '../../../api/genres';
import { ColorCarousel } from '../../../components/color-carousel';
import type { CarouselColor } from '../../../components/color-carousel';
import { t, getLang, setLang } from '../../../utils/i18n';
import { applyThemeColor } from '../../../utils/theme';
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
        <h1 class="profile-title">${t('profile.title')}</h1>
      </div>
      <p class="profile-loading" id="loading-msg">${t('common.loading')}</p>
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

  try {
    const [profileResult, colorsResult, genresResult] = await Promise.all([
      userSettings.getProfile(),
      colors.getAll(),
      genres.getGenres(),
    ]);

    if (!profileResult.success || !profileResult.data) {
      loadingMsg.textContent = t('common.error.fetch');
      return;
    }
    if (!colorsResult.success || !colorsResult.data) {
      loadingMsg.textContent = t('common.error.fetch');
      return;
    }

    prefillName = profileResult.data.name;
    prefillPersonalColorId = profileResult.data.personalColorId;
    prefillThemeColorId = profileResult.data.themeColorId;
    colorItems = colorsResult.data;

    // 個人カラー選択時: ジャンルが使用中の色はグレーアウト
    if (genresResult.success && genresResult.data) {
      genreUsedColorIds = new Set(genresResult.data.map((g) => g.colorId));
    }
  } catch {
    loadingMsg.textContent = t('common.error.fetch');
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
          ${t('profile.label.name')} <span class="profile-form-required">*</span>
        </label>
        <input
          type="text"
          id="input-name"
          class="profile-form-input"
          maxlength="50"
          placeholder="${t('profile.placeholder.name')}"
          value="${escHtml(prefillName)}"
        />
      </div>

      <div class="profile-form-field">
        <label class="profile-form-label">
          ${t('profile.label.personalColor')} <span class="profile-form-required">*</span>
        </label>
        <div id="personal-swatches"></div>
      </div>

      <div class="profile-form-field">
        <label class="profile-form-label">
          ${t('profile.label.themeColor')} <span class="profile-form-required">*</span>
        </label>
        <div id="theme-swatches"></div>
      </div>

      <div class="profile-form-field">
        <label class="profile-form-label">${t('profile.label.language')}</label>
        <div class="profile-lang-radios">
          <label class="profile-lang-radio">
            <input type="radio" name="language" value="ja" ${getLang() === 'ja' ? 'checked' : ''}/>
            ${t('profile.lang.ja')}
          </label>
          <label class="profile-lang-radio">
            <input type="radio" name="language" value="en" ${getLang() === 'en' ? 'checked' : ''}/>
            ${t('profile.lang.en')}
          </label>
        </div>
      </div>

      <p class="profile-form-error" id="form-error" style="display:none;"></p>

      <button type="submit" class="profile-form-save-btn" id="btn-save">${t('profile.save')}</button>

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

    const language = (profileBody.querySelector<HTMLInputElement>('input[name="language"]:checked')?.value ?? 'ja') as 'ja' | 'en';

    // Validation
    if (!name) {
      showError(t('profile.error.noName'));
      nameInput.focus();
      return;
    }
    if (selectedPersonalColorId === null) {
      showError(t('profile.error.noPersonal'));
      return;
    }
    if (selectedThemeColorId === null) {
      showError(t('profile.error.noTheme'));
      return;
    }

    btnSave.disabled = true;

    try {
      const result = await userSettings.updateProfile({
        name,
        personalColorId: selectedPersonalColorId,
        themeColorId: selectedThemeColorId,
        language,
      });

      if (result.success && result.data) {
        applyThemeColor(result.data.themeColorHex);
        localStorage.setItem('themeColorHex', result.data.themeColorHex);
        setLang(result.data.language as 'ja' | 'en');
        personalCarousel?.destroy();
        themeCarousel?.destroy();
        alert(t('profile.saved'));
        navigate('/settings');
      } else {
        const code = result.error?.code;
        if (code === 'USER_COLOR_CONFLICT') {
          showError(t('profile.error.colorConflict'));
        } else {
          showError(result.error?.message ?? t('profile.error.save'));
        }
      }
    } catch {
      showError(t('common.error.network'));
    } finally {
      btnSave.disabled = false;
    }
  });
}
