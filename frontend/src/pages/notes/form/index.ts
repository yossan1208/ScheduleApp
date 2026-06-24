import './form.css';
import { notes } from '../../../api/notes';
import { navigate } from '../../../utils/router';
import { t } from '../../../utils/i18n';

const COLORS = [
  '#F87171', '#FB923C', '#FBBF24', '#A3E635',
  '#34D399', '#22D3EE', '#60A5FA', '#818CF8',
  '#C084FC', '#E879F9', '#FB7185', '#94A3B8',
];

function parseEditId(): number | null {
  const match = location.pathname.match(/^\/notes\/(\d+)\/edit$/);
  return match ? parseInt(match[1], 10) : null;
}

export async function mount(app: HTMLElement): Promise<void> {
  const editId = parseEditId();
  const isEdit = editId !== null;
  let selectedColor = COLORS[0];

  app.innerHTML = `
    <div class="form-page">
      <div class="form-header">
        <button class="form-back-btn" id="btn-back">←</button>
        <h1 class="form-header-title">${isEdit ? t('notes.form.editTitle') : t('notes.form.createTitle')}</h1>
      </div>
      <div class="form-body">
        <div class="form-field">
          <label for="note-name">${t('notes.form.label')}</label>
          <input class="form-input" type="text" id="note-name" placeholder="${t('notes.form.placeholder')}" maxlength="50" />
        </div>
        <div class="form-field">
          <label>${t('notes.form.label.color')}</label>
          <div class="color-palette" id="color-palette">
            ${COLORS.map(c => `<button class="color-swatch${c === selectedColor ? ' selected' : ''}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}
          </div>
        </div>
      </div>
      <p class="form-error" id="form-error"></p>
      <button class="form-submit-btn" id="btn-submit">${isEdit ? t('notes.form.submit.edit') : t('notes.form.submit.create')}</button>
    </div>
  `;

  const nameInput = app.querySelector<HTMLInputElement>('#note-name')!;
  const palette   = app.querySelector<HTMLElement>('#color-palette')!;
  const submitBtn = app.querySelector<HTMLButtonElement>('#btn-submit')!;
  const errorEl   = app.querySelector<HTMLElement>('#form-error')!;

  // Edit mode: pre-fill with existing note data
  if (isEdit && editId !== null) {
    const allNotes = await notes.getAll();
    if (allNotes.success && allNotes.data) {
      const existing = allNotes.data.find(n => n.id === editId);
      if (existing) {
        nameInput.value = existing.name;
        // Update selectedColor and mark the matching swatch
        selectedColor = existing.color;
        palette.querySelectorAll<HTMLElement>('.color-swatch').forEach(s => {
          s.classList.toggle('selected', s.dataset.color === existing.color);
        });
      }
    }
  }

  app.querySelector('#btn-back')!.addEventListener('click', () => history.back());

  palette.addEventListener('click', (e) => {
    const swatch = (e.target as HTMLElement).closest<HTMLElement>('[data-color]');
    if (!swatch) return;
    palette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    swatch.classList.add('selected');
    selectedColor = swatch.dataset.color!;
  });

  submitBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) { errorEl.textContent = t('notes.form.error.empty'); return; }

    submitBtn.disabled = true;
    errorEl.textContent = '';

    const payload = { name, color: selectedColor };
    const result = isEdit && editId !== null
      ? await notes.update(editId, payload)
      : await notes.create(payload);

    if (!result.success) {
      errorEl.textContent = t('notes.form.error.save');
      submitBtn.disabled = false;
      return;
    }

    const noteId = result.data?.id ?? editId!;
    navigate(`/notes/${noteId}`, true);
  });
}
