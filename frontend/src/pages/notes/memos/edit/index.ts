import './edit.css';
import { memos, type MemoBlock } from '../../../../api/notes';
import { navigate } from '../../../../utils/router';

interface BlockState {
  type: string;
  content: string;
}

function parsePath(): { noteId: number; memoId: number } {
  const m = location.pathname.match(/^\/notes\/(\d+)\/memos\/(\d+)$/);
  return m
    ? { noteId: parseInt(m[1], 10), memoId: parseInt(m[2], 10) }
    : { noteId: 0, memoId: 0 };
}

function parseCheckbox(content: string | null): { checked: boolean; text: string } {
  if (!content) return { checked: false, text: '' };
  if (content.startsWith('1:')) return { checked: true,  text: content.slice(2) };
  if (content.startsWith('0:')) return { checked: false, text: content.slice(2) };
  return { checked: false, text: content };
}

function serializeCheckbox(checked: boolean, text: string): string {
  return `${checked ? '1' : '0'}:${text}`;
}

function autoResize(ta: HTMLTextAreaElement): void {
  ta.style.height = 'auto';
  ta.style.height = `${ta.scrollHeight}px`;
}

export async function mount(app: HTMLElement): Promise<void> {
  const { noteId, memoId } = parsePath();
  let blocks: BlockState[] = [];
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let isImportant = false;

  app.innerHTML = `
    <div class="edit-page">
      <div class="edit-header">
        <button class="edit-back-btn" id="btn-back">←</button>
        <span class="edit-header-title">Edit</span>
        <button class="edit-delete-btn" id="btn-delete">🗑</button>
      </div>
      <div class="edit-save-status" id="save-status"></div>
      <div class="edit-blocks" id="blocks-area"><p style="color:#888">読み込み中…</p></div>
      <div class="edit-toolbar">
        <button class="toolbar-btn" data-add="heading">T</button>
        <button class="toolbar-btn" data-add="bullet">•</button>
        <button class="toolbar-btn" data-add="ordered">1</button>
        <button class="toolbar-btn" data-add="checkbox">☐</button>
      </div>
    </div>
  `;

  const blocksArea  = app.querySelector<HTMLElement>('#blocks-area')!;
  const saveStatus  = app.querySelector<HTMLElement>('#save-status')!;
  const deleteBtn   = app.querySelector<HTMLElement>('#btn-delete')!;

  app.querySelector('#btn-back')!.addEventListener('click', () => {
    if (saveTimer !== null) { clearTimeout(saveTimer); save(true); }
    navigate(`/notes/${noteId}`);
  });

  deleteBtn.addEventListener('click', async () => {
    if (!confirm('このメモを削除しますか？')) return;
    const r = await memos.delete(memoId);
    if (r.success) navigate(`/notes/${noteId}`, true);
    else alert('削除に失敗しました');
  });

  app.querySelector('.edit-toolbar')!.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-add]');
    if (!btn) return;
    blocks.push({ type: btn.dataset.add!, content: btn.dataset.add === 'checkbox' ? '0:' : '' });
    renderBlocks();
    scheduleSave();
  });

  // 初期データ取得
  const result = await memos.getDetail(memoId);
  if (!result.success || !result.data) {
    blocksArea.innerHTML = '<p style="color:#ef4444">メモを取得できませんでした</p>';
    return;
  }

  isImportant = result.data.isImportant;
  if (isImportant) deleteBtn.style.display = 'none';

  blocks = result.data.blocks.map((b: MemoBlock) => ({
    type:    b.type,
    content: b.content ?? '',
  }));

  renderBlocks();

  function renderBlocks(): void {
    blocksArea.innerHTML = '';
    blocks.forEach((block, idx) => {
      const row = document.createElement('div');
      row.className = 'block-row';
      row.dataset.idx = String(idx);

      if (block.type === 'checkbox') {
        const { checked, text } = parseCheckbox(block.content);
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'block-checkbox';
        cb.checked = checked;
        cb.addEventListener('change', () => {
          blocks[idx].content = serializeCheckbox(cb.checked, ta.value);
          scheduleSave();
        });

        const ta = document.createElement('textarea');
        ta.className = 'block-input';
        ta.value = text;
        ta.rows = 1;
        ta.addEventListener('input', () => {
          autoResize(ta);
          blocks[idx].content = serializeCheckbox(cb.checked, ta.value);
          handleDelete(ta, idx);
          scheduleSave();
        });

        row.appendChild(cb);
        row.appendChild(ta);
        setTimeout(() => autoResize(ta), 0);

      } else {
        const prefix = document.createElement('span');
        prefix.className = 'block-prefix';
        if (block.type === 'bullet')  prefix.textContent = '•';
        if (block.type === 'ordered') prefix.textContent = `${idx + 1}.`;

        const ta = document.createElement('textarea');
        ta.className = `block-input${block.type === 'heading' ? ' heading' : ''}`;
        ta.value = block.content;
        ta.rows = 1;
        ta.addEventListener('input', () => {
          autoResize(ta);
          blocks[idx].content = ta.value;
          handleDelete(ta, idx);
          scheduleSave();
        });

        if (block.type !== 'heading') row.appendChild(prefix);
        row.appendChild(ta);
        setTimeout(() => autoResize(ta), 0);
      }

      blocksArea.appendChild(row);
    });

    // 最後のブロックにフォーカス
    const inputs = blocksArea.querySelectorAll<HTMLTextAreaElement>('.block-input');
    if (inputs.length > 0) {
      const last = inputs[inputs.length - 1];
      last.focus();
      last.setSelectionRange(last.value.length, last.value.length);
    }
  }

  function handleDelete(ta: HTMLTextAreaElement, idx: number): void {
    if (ta.value === '' && blocks.length > 1) {
      blocks.splice(idx, 1);
      renderBlocks();
    }
  }

  function scheduleSave(): void {
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveStatus.textContent = '編集中…';
    saveTimer = setTimeout(() => save(false), 1500);
  }

  async function save(immediate: boolean): Promise<void> {
    saveTimer = null;
    saveStatus.textContent = '保存中…';
    const payload = {
      blocks: blocks.map((b, i) => ({ type: b.type, content: b.content || null, sortOrder: i })),
    };
    const r = await memos.save(memoId, payload);
    saveStatus.textContent = r.success ? (immediate ? '' : '保存しました') : '保存に失敗';
    if (!immediate) setTimeout(() => { saveStatus.textContent = ''; }, 2000);
  }
}
