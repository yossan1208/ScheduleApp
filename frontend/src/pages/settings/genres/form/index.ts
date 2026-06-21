import { navigate } from '../../../../utils/router';
import { genres } from '../../../../api/genres';
import type { CreateGenrePayload, UpdateGenrePayload } from '../../../../api/genres';
import { colors } from '../../../../api/settings';
import type { ColorItem } from '../../../../api/settings';
import './form.css';

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

function parseEditId(): number | null {
  const m = location.pathname.match(/^\/settings\/genres\/(\d+)\/edit$/);
  return m ? parseInt(m[1], 10) : null;
}

function renderSwatches(colorItems: ColorItem[], selectedColorId: number | null): string {
  return `
    <div class="color-swatches">
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
  const editId = parseEditId();
  const isEdit = editId !== null;
  const pageTitle = isEdit ? 'ジャンル編集' : 'ジャンル作成';

  // Initial loading state
  app.innerHTML = `
    <div class="genre-form-page">
      <div class="genre-form-header">
        <button class="genre-form-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="genre-form-title">${escHtml(pageTitle)}</h1>
      </div>
      <p class="genre-form-loading" id="loading-msg">読み込み中…</p>
      <div class="genre-form-body" id="form-body" style="display:none;"></div>
    </div>
  `;

  const btnBack = app.querySelector<HTMLButtonElement>('#btn-back')!;
  const loadingMsg = app.querySelector<HTMLParagraphElement>('#loading-msg')!;
  const formBody = app.querySelector<HTMLDivElement>('#form-body')!;

  btnBack.addEventListener('click', () => navigate('/settings/genres'));

  // Fetch colors (and genre data if edit mode)
  let colorItems: ColorItem[] = [];
  let prefillName = '';
  let prefillColorId: number | null = null;
  let prefillTime = '';

  try {
    const [colorsResult, genresResult] = await Promise.all([
      colors.getAll(),
      isEdit ? genres.getGenres() : Promise.resolve(null),
    ]);

    if (!colorsResult.success || !colorsResult.data) {
      loadingMsg.textContent = 'カラーデータの取得に失敗しました';
      return;
    }
    colorItems = colorsResult.data;

    if (isEdit && genresResult) {
      if (!genresResult.success || !genresResult.data) {
        loadingMsg.textContent = 'ジャンルデータの取得に失敗しました';
        return;
      }
      const target = genresResult.data.find((g) => g.id === editId);
      if (!target) {
        loadingMsg.textContent = 'ジャンルが見つかりませんでした';
        return;
      }
      prefillName = target.name;
      prefillColorId = target.colorId;
      prefillTime = target.defaultNotificationTime ?? '';
    }
  } catch {
    loadingMsg.textContent = 'データの取得に失敗しました';
    return;
  }

  let selectedColorId: number | null = prefillColorId;

  // Render form
  loadingMsg.style.display = 'none';
  formBody.style.display = '';
  formBody.innerHTML = `
    <form class="genre-form" id="genre-form" novalidate>
      <div class="genre-form-field">
        <label class="genre-form-label" for="input-name">ジャンル名 <span class="genre-form-required">*</span></label>
        <input
          type="text"
          id="input-name"
          class="genre-form-input"
          maxlength="20"
          placeholder="ジャンル名を入力"
          value="${escHtml(prefillName)}"
        />
      </div>

      <div class="genre-form-field">
        <label class="genre-form-label">色を選択 <span class="genre-form-required">*</span></label>
        <div id="swatches-container">
          ${renderSwatches(colorItems, selectedColorId)}
        </div>
      </div>

      <div class="genre-form-field">
        <label class="genre-form-label" for="input-time">デフォルト通知時間（任意）</label>
        <input
          type="time"
          id="input-time"
          class="genre-form-input"
          value="${escHtml(prefillTime)}"
        />
      </div>

      <p class="genre-form-error" id="form-error" style="display:none;"></p>

      <button type="submit" class="genre-form-save-btn" id="btn-save">保存する</button>

      ${
        isEdit
          ? `<button type="button" class="genre-form-delete-btn" id="btn-delete">このジャンルを削除する</button>`
          : ''
      }
    </form>
  `;

  const swatchesContainer = formBody.querySelector<HTMLDivElement>('#swatches-container')!;
  const errorEl = formBody.querySelector<HTMLParagraphElement>('#form-error')!;

  // Swatch click: update selectedColorId and re-render swatches
  swatchesContainer.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.color-swatch');
    if (!btn) return;
    const colorId = parseInt(btn.dataset.colorId ?? '', 10);
    if (isNaN(colorId)) return;
    selectedColorId = colorId;
    swatchesContainer.innerHTML = renderSwatches(colorItems, selectedColorId);
  });

  // Delete button (edit mode only)
  if (isEdit) {
    const btnDelete = formBody.querySelector<HTMLButtonElement>('#btn-delete')!;
    btnDelete.addEventListener('click', async () => {
      if (!confirm('このジャンルを削除しますか？')) return;
      btnDelete.disabled = true;
      try {
        await genres.delete(editId!);
        navigate('/settings/genres', true);
      } catch {
        btnDelete.disabled = false;
        showError('削除に失敗しました');
      }
    });
  }

  function showError(msg: string): void {
    errorEl.textContent = msg;
    errorEl.style.display = '';
  }

  function hideError(): void {
    errorEl.style.display = 'none';
  }

  // Form submit
  const form = formBody.querySelector<HTMLFormElement>('#genre-form')!;
  const btnSave = formBody.querySelector<HTMLButtonElement>('#btn-save')!;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const nameInput = formBody.querySelector<HTMLInputElement>('#input-name')!;
    const timeInput = formBody.querySelector<HTMLInputElement>('#input-time')!;

    const name = nameInput.value.trim();
    const timeValue = timeInput.value; // "HH:mm" or ""
    const defaultNotificationTime = timeValue || null;

    // Validation
    if (!name) {
      showError('ジャンル名を入力してください');
      nameInput.focus();
      return;
    }
    if (selectedColorId === null) {
      showError('色を選択してください');
      return;
    }

    btnSave.disabled = true;

    try {
      if (isEdit) {
        const payload: UpdateGenrePayload = { name, colorId: selectedColorId, defaultNotificationTime };
        const result = await genres.update(editId!, payload);
        if (!result.success) {
          showError(result.error?.message ?? '更新に失敗しました');
          return;
        }
      } else {
        const payload: CreateGenrePayload = { name, colorId: selectedColorId, defaultNotificationTime };
        const result = await genres.create(payload);
        if (!result.success) {
          showError(result.error?.message ?? '作成に失敗しました');
          return;
        }
      }
      navigate('/settings/genres', true);
    } catch {
      showError('通信エラーが発生しました');
    } finally {
      btnSave.disabled = false;
    }
  });
}
