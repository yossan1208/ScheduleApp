import './archive.css';
import { notes } from '../../../api/notes';
import { navigate } from '../../../utils/router';
import { t } from '../../../utils/i18n';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function mount(app: HTMLElement): Promise<void> {
  const isAdmin = localStorage.getItem('role') === '0';

  app.innerHTML = `
    <div class="archive-page">
      <div class="archive-header">
        <button class="archive-back-btn" id="btn-back">←</button>
        <h1 class="archive-header-title">${t('notes.archive.title')}</h1>
      </div>
      <div id="archive-body"><p class="archive-empty">${t('common.loading')}</p></div>
    </div>
  `;

  app.querySelector('#btn-back')!.addEventListener('click', () => navigate('/notes'));

  await loadArchive(app, isAdmin);
}

async function loadArchive(app: HTMLElement, isAdmin: boolean): Promise<void> {
  const body = app.querySelector<HTMLElement>('#archive-body')!;

  const result = await notes.getAll(true);
  if (!result.success || !result.data) {
    body.innerHTML = `<p class="archive-empty">${t('notes.archive.error')}</p>`;
    return;
  }

  const archivedNotes = result.data;
  if (archivedNotes.length === 0) {
    body.innerHTML = `<p class="archive-empty">${t('notes.archive.empty')}</p>`;
    return;
  }

  const list = document.createElement('div');
  list.className = 'archive-list';

  for (const note of archivedNotes) {
    const card = document.createElement('div');
    card.className = 'archive-card';
    card.innerHTML = `
      <span class="archive-card-name">${escapeHtml(note.name)}</span>
      ${isAdmin ? `<button class="archive-delete-btn" data-id="${note.id}" aria-label="削除">🗑</button>` : ''}
    `;
    list.appendChild(card);
  }

  body.innerHTML = '';
  body.appendChild(list);

  if (isAdmin) {
    list.querySelectorAll<HTMLElement>('[data-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(t('notes.archive.deleteConfirm'))) return;
        const id = parseInt(btn.dataset.id!, 10);
        const r = await notes.delete(id);
        if (r.success) await loadArchive(app, isAdmin);
        else alert(t('notes.archive.deleteError'));
      });
    });
  }
}
