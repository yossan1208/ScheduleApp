import './notes.css';
import { notes, memos } from '../../api/notes';
import { navigate } from '../../utils/router';

async function navigateToSystemNote(noteId: number): Promise<void> {
  const result = await memos.getByNote(noteId);
  if (!result.success || !result.data) return;
  const important = result.data.find(m => m.isImportant);
  if (!important) return;
  navigate(`/notes/${noteId}/memos/${important.id}`);
}

function attachLongPress(el: HTMLElement, onLong: () => void): void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function start(): void {
    timer = setTimeout(() => { timer = null; onLong(); }, 500);
  }
  function cancel(): void {
    if (timer !== null) { clearTimeout(timer); timer = null; }
  }
  function tap(): void {
    if (timer !== null) cancel(); // was not long press — handled by click
  }

  el.addEventListener('touchstart',  start,  { passive: true });
  el.addEventListener('touchend',    tap);
  el.addEventListener('touchcancel', cancel);
  el.addEventListener('mousedown',   start);
  el.addEventListener('mouseup',     tap);
  el.addEventListener('mouseleave',  cancel);
}

export async function mount(app: HTMLElement): Promise<void> {
  app.innerHTML = `
    <div class="notes-page">
      <div class="notes-header">
        <h1 class="notes-title">SHARE</h1>
      </div>
      <div id="notes-body"><p class="notes-empty">読み込み中…</p></div>
      <button class="notes-archive-btn" id="btn-archive">Archive</button>
      <button class="notes-fab" id="btn-fab" aria-label="ノートを追加">+</button>
    </div>
  `;

  app.querySelector('#btn-archive')!.addEventListener('click', () => navigate('/notes/archive'));
  app.querySelector('#btn-fab')!.addEventListener('click', () => navigate('/notes/new'));

  const result = await notes.getAll();
  const body = app.querySelector<HTMLElement>('#notes-body')!;

  if (!result.success || !result.data) {
    body.innerHTML = '<p class="notes-empty">ノートを取得できませんでした</p>';
    return;
  }

  const allNotes = result.data;
  const systemNote = allNotes.find(n => n.isSystem);
  const normalNotes = allNotes.filter(n => !n.isSystem);

  let html = '';

  if (systemNote) {
    html += `
      <p class="notes-section-label">重要事項</p>
      <div class="notes-system-card" data-system-id="${systemNote.id}">${systemNote.name}</div>
    `;
  }

  if (normalNotes.length > 0) {
    html += `<p class="notes-section-label">ノート</p><div class="notes-list">`;
    for (const note of normalNotes) {
      html += `<div class="notes-card" data-id="${note.id}" style="border-left-color: ${note.color}">${note.name}</div>`;
    }
    html += `</div>`;
  } else if (!systemNote) {
    html = '<p class="notes-empty">ノートがありません</p>';
  }

  body.innerHTML = html;

  if (systemNote) {
    body.querySelector<HTMLElement>(`[data-system-id="${systemNote.id}"]`)!
      .addEventListener('click', () => navigateToSystemNote(systemNote.id));
  }

  for (const note of normalNotes) {
    const card = body.querySelector<HTMLElement>(`[data-id="${note.id}"]`)!;

    let longPressed = false;

    attachLongPress(card, () => {
      longPressed = true;
      navigate(`/notes/${note.id}/edit`);
    });

    card.addEventListener('click', () => {
      if (longPressed) { longPressed = false; return; }
      navigate(`/notes/${note.id}`);
    });
  }
}
