import './form.css';
import { notes } from '../../../api/notes';
import { navigate } from '../../../utils/router';

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
        <h1 class="form-header-title">${isEdit ? 'ノートを編集' : 'ノートを作成'}</h1>
      </div>
      <div class="form-body">
        <div class="form-field">
          <label for="note-name">ノート名</label>
          <input class="form-input" type="text" id="note-name" placeholder="ノート名を入力" maxlength="50" />
        </div>
        <div class="form-field">
          <label>色</label>
          <div class="color-palette" id="color-palette">
            ${COLORS.map(c => `<button class="color-swatch${c === selectedColor ? ' selected' : ''}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}
          </div>
        </div>
      </div>
      <p class="form-error" id="form-error"></p>
      <button class="form-submit-btn" id="btn-submit">${isEdit ? '更新する' : '作成する'}</button>
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
    if (!name) { errorEl.textContent = 'ノート名を入力してください'; return; }

    submitBtn.disabled = true;
    errorEl.textContent = '';

    const payload = { name, color: selectedColor };
    const result = isEdit && editId !== null
      ? await notes.update(editId, payload)
      : await notes.create(payload);

    if (!result.success) {
      errorEl.textContent = '保存に失敗しました';
      submitBtn.disabled = false;
      return;
    }

    const noteId = result.data?.id ?? editId!;
    navigate(`/notes/${noteId}`, true);
  });
}
