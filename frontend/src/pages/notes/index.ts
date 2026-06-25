import './notes.css';
import { notes, memos, type MemoBlock } from '../../api/notes';
import { navigate } from '../../utils/router';
import { t } from '../../utils/i18n';

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    if (timer !== null) cancel();
  }

  el.addEventListener('touchstart',  start,  { passive: true });
  el.addEventListener('touchend',    tap);
  el.addEventListener('touchcancel', cancel);
  el.addEventListener('mousedown',   start);
  el.addEventListener('mouseup',     tap);
  el.addEventListener('mouseleave',  cancel);
}

function hasContent(block: MemoBlock): boolean {
  if (!block.content) return false;
  if (block.type === 'checkbox') {
    const text = block.content.startsWith('1:') ? block.content.slice(2)
               : block.content.startsWith('0:') ? block.content.slice(2)
               : block.content;
    return text.trim().length > 0;
  }
  return block.content.trim().length > 0;
}

function blockToLineHtml(block: MemoBlock): string {
  switch (block.type) {
    case 'heading': return escHtml(block.content ?? '');
    case 'bullet':  return `• ${escHtml(block.content ?? '')}`;
    case 'ordered': return escHtml(block.content ?? '');
    case 'checkbox': {
      if (!block.content) return '';
      if (block.content.startsWith('1:')) return `☑ ${escHtml(block.content.slice(2))}`;
      if (block.content.startsWith('0:')) return `☐ ${escHtml(block.content.slice(2))}`;
      return `☐ ${escHtml(block.content)}`;
    }
    default: return escHtml(block.content ?? '');
  }
}

export async function mount(app: HTMLElement): Promise<void> {
  app.innerHTML = `
    <div class="notes-page">
      <div class="notes-header">
        <h1 class="notes-title">${t('notes.title')}</h1>
      </div>
      <div id="notes-body"><p class="notes-empty">${t('common.loading')}</p></div>
      <button class="notes-archive-btn" id="btn-archive">${t('notes.archive')}</button>
      <button class="nav-arrow-btn notes-nav-btn-fixed" id="btn-schedule" aria-label="${t('notes.aria.schedule')}">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M8 2v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3V2h-2v2h-4V2H8zM5 10h14v10H5V10zm2 2v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2zM7 16v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2z"/>
        </svg>
      </button>
      <button class="fab notes-fab-fixed" id="btn-fab" aria-label="${t('notes.aria.add')}">+</button>
    </div>
  `;

  app.querySelector('#btn-archive')!.addEventListener('click', () => navigate('/notes/archive'));
  app.querySelector('#btn-schedule')!.addEventListener('click', () => navigate('/home'));
  app.querySelector('#btn-fab')!.addEventListener('click', () => navigate('/notes/new'));

  const result = await notes.getAll();
  const body = app.querySelector<HTMLElement>('#notes-body')!;

  if (!result.success || !result.data) {
    body.innerHTML = `<p class="notes-empty">${t('notes.error')}</p>`;
    return;
  }

  const allNotes   = result.data;
  const systemNote = allNotes.find(n => n.isSystem);
  const normalNotes = allNotes.filter(n => !n.isSystem);

  // システムノートのメモ内容を取得
  let systemMemoId: number | null = null;
  let systemBlocks: MemoBlock[] = [];

  if (systemNote) {
    const memoListResult = await memos.getByNote(systemNote.id);
    const importantMemo = memoListResult.data?.find(m => m.isImportant) ?? null;
    if (importantMemo) {
      systemMemoId = importantMemo.id;
      const detailResult = await memos.getDetail(importantMemo.id);
      systemBlocks = (detailResult.data?.blocks ?? []).filter(hasContent).slice(0, 10);
    }
  }

  let html = '';

  if (systemNote) {
    const contentHtml = systemBlocks.length > 0
      ? systemBlocks.map(b =>
          `<div class="notes-system-line${b.type === 'heading' ? ' notes-system-line--heading' : ''}">${blockToLineHtml(b)}</div>`
        ).join('')
      : '';

    html += `
      <div class="notes-system-card" data-system-id="${systemNote.id}">
        <div class="notes-system-title">${t('notes.system.title')}</div>
        ${contentHtml}
      </div>`;
  }

  if (normalNotes.length > 0) {
    html += `<p class="notes-section-label">${t('notes.section.label')}</p><div class="notes-list">`;
    for (const note of normalNotes) {
      const safeColor = /^#[0-9a-fA-F]{3,6}$/.test(note.color ?? '') ? note.color : '#ccc';
      html += `<div class="notes-card" data-id="${note.id}" style="border-left-color: ${safeColor}">${escHtml(note.name)}</div>`;
    }
    html += `</div>`;
  } else if (!systemNote) {
    html = `<p class="notes-empty">${t('notes.empty')}</p>`;
  }

  body.innerHTML = html;

  if (systemNote) {
    body.querySelector<HTMLElement>(`[data-system-id="${systemNote.id}"]`)!
      .addEventListener('click', () => {
        if (systemMemoId !== null) navigate(`/notes/${systemNote.id}/memos/${systemMemoId}`);
      });
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
