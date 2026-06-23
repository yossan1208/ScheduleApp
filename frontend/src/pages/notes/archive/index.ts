import './archive.css';
import { notes } from '../../../api/notes';
import { navigate } from '../../../utils/router';

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
        <h1 class="archive-header-title">Archive</h1>
      </div>
      <div id="archive-body"><p class="archive-empty">読み込み中…</p></div>
    </div>
  `;

  app.querySelector('#btn-back')!.addEventListener('click', () => navigate('/notes'));

  await loadArchive(app, isAdmin);
}

async function loadArchive(app: HTMLElement, isAdmin: boolean): Promise<void> {
  const body = app.querySelector<HTMLElement>('#archive-body')!;

  const result = await notes.getAll(true);
  if (!result.success || !result.data) {
    body.innerHTML = '<p class="archive-empty">取得できませんでした</p>';
    return;
  }

  const archivedNotes = result.data;
  if (archivedNotes.length === 0) {
    body.innerHTML = '<p class="archive-empty">アーカイブされたノートはありません</p>';
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
        if (!confirm('このノートを完全に削除しますか？この操作は取り消せません。')) return;
        const id = parseInt(btn.dataset.id!, 10);
        const r = await notes.delete(id);
        if (r.success) await loadArchive(app, isAdmin);
        else alert('削除に失敗しました');
      });
    });
  }
}
