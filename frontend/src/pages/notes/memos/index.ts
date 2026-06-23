import './memos.css';
import { notes, memos } from '../../../api/notes';
import { navigate } from '../../../utils/router';

function parseNoteId(): number {
  const match = location.pathname.match(/^\/notes\/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function mount(app: HTMLElement): Promise<void> {
  const noteId = parseNoteId();

  app.innerHTML = `
    <div class="memos-page">
      <div class="memos-header">
        <button class="memos-back-btn" id="btn-back">←</button>
        <h1 class="memos-header-title" id="note-title">読み込み中…</h1>
      </div>
      <div id="memos-body"></div>
      <button class="memos-archive-btn" id="btn-archive" style="display:none">アーカイブに移動</button>
      <button class="memos-nav-btn" id="btn-schedule" aria-label="スケジュールへ">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M8 2v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3V2h-2v2h-4V2H8zM5 10h14v10H5V10zm2 2v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2zM7 16v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2z"/>
        </svg>
      </button>
      <button class="memos-fab" id="btn-fab" aria-label="メモを追加">+</button>
    </div>
  `;

  app.querySelector('#btn-back')!.addEventListener('click', () => navigate('/notes'));
  app.querySelector('#btn-schedule')!.addEventListener('click', () => navigate('/home'));

  // ノート名・isSystem を取得
  const notesResult = await notes.getAll();
  let isSystem = false;
  if (notesResult.success && notesResult.data) {
    const note = notesResult.data.find(n => n.id === noteId);
    if (note) {
      app.querySelector<HTMLElement>('#note-title')!.textContent = note.name;
      isSystem = note.isSystem;
    }
  }

  const archiveBtn = app.querySelector<HTMLButtonElement>('#btn-archive')!;
  if (!isSystem) {
    archiveBtn.style.display = '';
    archiveBtn.addEventListener('click', async () => {
      if (!confirm('このノートをアーカイブに移動しますか？')) return;
      const r = await notes.archive(noteId);
      if (r.success) navigate('/notes');
      else alert('アーカイブに失敗しました');
    });
  }

  const fabBtn = app.querySelector<HTMLButtonElement>('#btn-fab')!;
  fabBtn.addEventListener('click', async () => {
    if (fabBtn.disabled) return;
    fabBtn.disabled = true;
    const r = await memos.create(noteId);
    fabBtn.disabled = false;
    if (!r.success || !r.data) { alert('メモの作成に失敗しました'); return; }
    navigate(`/notes/${noteId}/memos/${r.data.id}`);
  });

  await loadMemos(app, noteId);
}

async function loadMemos(app: HTMLElement, noteId: number): Promise<void> {
  const body = app.querySelector<HTMLElement>('#memos-body')!;
  body.innerHTML = '<p class="memos-empty">読み込み中…</p>';

  const result = await memos.getByNote(noteId);
  if (!result.success || !result.data) {
    body.innerHTML = '<p class="memos-empty">メモを取得できませんでした</p>';
    return;
  }

  const all = result.data;
  if (all.length === 0) {
    body.innerHTML = '<p class="memos-empty">メモがありません</p>';
    return;
  }

  const important = all.filter(m => m.isImportant);
  const normal    = all.filter(m => !m.isImportant);

  let html = '';

  if (important.length > 0) {
    html += `<p class="memos-section-label">重要事項</p><div class="memos-list">`;
    for (const m of important) {
      html += memoCardHtml(m.id, m.title ?? '（タイトルなし）', m.updatedAt);
    }
    html += `</div>`;
  }

  if (normal.length > 0) {
    html += `<p class="memos-section-label">メモ</p><div class="memos-list">`;
    for (const m of normal) {
      html += memoCardHtml(m.id, m.title ?? '（タイトルなし）', m.updatedAt);
    }
    html += `</div>`;
  }

  body.innerHTML = html;

  body.querySelectorAll<HTMLElement>('[data-memo-id]').forEach(card => {
    const memoId = parseInt(card.dataset.memoId!, 10);
    card.addEventListener('click', () => navigate(`/notes/${noteId}/memos/${memoId}`));
  });
}

function memoCardHtml(id: number, title: string, updatedAt: string | null): string {
  return `
    <div class="memos-card" data-memo-id="${id}">
      <div class="memos-card-title">${escapeHtml(title)}</div>
      <div class="memos-card-date">${formatDate(updatedAt)}</div>
    </div>
  `;
}
