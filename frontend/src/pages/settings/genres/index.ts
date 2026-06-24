import { navigate } from '../../../utils/router';
import { genres } from '../../../api/genres';
import type { Genre } from '../../../api/genres';
import { t } from '../../../utils/i18n';
import './genres.css';

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

function renderCards(genreList: Genre[], canEdit: boolean): string {
  if (genreList.length === 0) {
    return `<p class="genres-empty">${t('genres.empty')}</p>`;
  }
  return genreList
    .map(
      (g) => `
    <div
      class="genre-card${canEdit ? ' genre-card--clickable' : ''}"
      style="background-color: ${safeColor(g.colorHex)};"
      data-id="${g.id}"
    >
      <span class="genre-card-name">${escHtml(g.name)}</span>
    </div>`
    )
    .join('');
}

export async function mount(app: HTMLElement): Promise<void> {
  const role = localStorage.getItem('role');
  const canEdit = role === '0' || role === '1';

  app.innerHTML = `
    <div class="genres-page">
      <div class="genres-header">
        <button class="genres-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="genres-title">${t('genres.title')}</h1>
      </div>
      ${canEdit ? `<button id="btn-add" class="genres-add-btn">${t('genres.add')}</button>` : ''}
      <p class="genres-loading" id="loading-msg">${t('common.loading')}</p>
      <div class="genres-list" id="genres-list" style="display:none;"></div>
    </div>
  `;

  const btnBack = app.querySelector<HTMLButtonElement>('#btn-back')!;
  const loadingMsg = app.querySelector<HTMLParagraphElement>('#loading-msg')!;
  const list = app.querySelector<HTMLDivElement>('#genres-list')!;

  btnBack.addEventListener('click', () => navigate('/settings'));

  if (canEdit) {
    const btnAdd = app.querySelector<HTMLButtonElement>('#btn-add')!;
    btnAdd.addEventListener('click', () => navigate('/settings/genres/new'));
  }

  // Event delegation for card taps (GL+ only)
  if (canEdit) {
    list.addEventListener('click', (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('.genre-card');
      if (!card) return;
      const id = card.dataset.id;
      if (id) {
        navigate(`/settings/genres/${id}/edit`);
      }
    });
  }

  try {
    const result = await genres.getGenres();
    loadingMsg.style.display = 'none';
    list.style.display = '';
    if (result.success && result.data) {
      list.innerHTML = renderCards(result.data, canEdit);
    } else {
      list.innerHTML = `<p class="genres-empty">${t('genres.error')}</p>`;
    }
  } catch {
    loadingMsg.textContent = t('genres.error');
  }
}
