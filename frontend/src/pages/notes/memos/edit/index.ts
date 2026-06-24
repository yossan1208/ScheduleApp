import './edit.css';
import { Editor, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { memos, type MemoBlock } from '../../../../api/notes';
import { navigate } from '../../../../utils/router';
import { t } from '../../../../utils/i18n';

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

function extractText(node: Record<string, unknown>): string {
  if (node.type === 'text') return (node.text as string) ?? '';
  const children = (node.content as Record<string, unknown>[]) ?? [];
  return children.map(extractText).join('');
}

function blocksToTiptap(blocks: MemoBlock[]): Record<string, unknown> {
  const content: Record<string, unknown>[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    if (block.type === 'heading') {
      content.push({
        type: 'heading',
        attrs: { level: 1 },
        content: block.content ? [{ type: 'text', text: block.content }] : [],
      });
      i++;
    } else if (block.type === 'bullet') {
      const items: Record<string, unknown>[] = [];
      while (i < blocks.length && blocks[i].type === 'bullet') {
        items.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: blocks[i].content ? [{ type: 'text', text: blocks[i].content }] : [],
          }],
        });
        i++;
      }
      content.push({ type: 'bulletList', content: items });
    } else if (block.type === 'ordered') {
      const items: Record<string, unknown>[] = [];
      while (i < blocks.length && blocks[i].type === 'ordered') {
        items.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: blocks[i].content ? [{ type: 'text', text: blocks[i].content }] : [],
          }],
        });
        i++;
      }
      content.push({ type: 'orderedList', content: items });
    } else if (block.type === 'checkbox') {
      const items: Record<string, unknown>[] = [];
      while (i < blocks.length && blocks[i].type === 'checkbox') {
        const { checked, text } = parseCheckbox(blocks[i].content);
        items.push({
          type: 'taskItem',
          attrs: { checked },
          content: [{
            type: 'paragraph',
            content: text ? [{ type: 'text', text }] : [],
          }],
        });
        i++;
      }
      content.push({ type: 'taskList', content: items });
    } else {
      content.push({
        type: 'paragraph',
        content: block.content ? [{ type: 'text', text: block.content }] : [],
      });
      i++;
    }
  }

  if (content.length === 0) content.push({ type: 'paragraph' });
  return { type: 'doc', content };
}

function tiptapToBlocks(
  doc: Record<string, unknown>,
): Array<{ type: string; content: string | null; sortOrder: number }> {
  const result: Array<{ type: string; content: string | null; sortOrder: number }> = [];
  let order = 0;

  for (const node of (doc.content as Record<string, unknown>[]) ?? []) {
    switch (node.type) {
      case 'heading': {
        const text = extractText(node);
        result.push({ type: 'heading', content: text || null, sortOrder: order++ });
        break;
      }
      case 'bulletList':
        for (const item of (node.content as Record<string, unknown>[]) ?? []) {
          const text = extractText(item);
          if (text) result.push({ type: 'bullet', content: text, sortOrder: order++ });
        }
        break;
      case 'orderedList':
        for (const item of (node.content as Record<string, unknown>[]) ?? []) {
          const text = extractText(item);
          if (text) result.push({ type: 'ordered', content: text, sortOrder: order++ });
        }
        break;
      case 'taskList':
        for (const item of (node.content as Record<string, unknown>[]) ?? []) {
          const checked = (item.attrs as Record<string, boolean>)?.checked ?? false;
          const text = extractText(item);
          result.push({
            type: 'checkbox',
            content: `${checked ? '1' : '0'}:${text}`,
            sortOrder: order++,
          });
        }
        break;
      case 'paragraph': {
        const text = extractText(node);
        if (text) result.push({ type: 'bullet', content: text, sortOrder: order++ });
        break;
      }
    }
  }

  return result;
}

export async function mount(app: HTMLElement): Promise<void> {
  const { noteId, memoId } = parsePath();
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let editor: Editor | null = null;
  let backTarget = `/notes/${noteId}`;

  app.innerHTML = `
    <div class="edit-page">
      <div class="edit-header">
        <button class="edit-back-btn" id="btn-back">←</button>
        <span class="edit-header-title">Edit</span>
        <button class="edit-delete-btn" id="btn-delete">🗑</button>
      </div>
      <div class="edit-save-status" id="save-status"></div>
      <div class="edit-editor-wrap">
        <div class="edit-editor" id="editor-mount"></div>
      </div>
      <div class="edit-toolbar">
        <button class="toolbar-btn" id="tb-heading" title="見出し">H</button>
        <button class="toolbar-btn" id="tb-bullet"  title="箇条書き">•</button>
        <button class="toolbar-btn" id="tb-ordered" title="番号付き">1</button>
        <button class="toolbar-btn" id="tb-task"    title="チェックボックス">☐</button>
      </div>
    </div>
  `;

  const saveStatus = app.querySelector<HTMLElement>('#save-status')!;
  const deleteBtn  = app.querySelector<HTMLElement>('#btn-delete')!;

  // ── 戻るボタン ──────────────────────────────────────────
  app.querySelector('#btn-back')!.addEventListener('click', async () => {
    if (saveTimer !== null) { clearTimeout(saveTimer); await flush(); }
    editor?.destroy();
    navigate(backTarget);
  });

  // ── メモ詳細を取得 ──────────────────────────────────────
  const result = await memos.getDetail(memoId);
  if (!result.success || !result.data) {
    app.querySelector<HTMLElement>('.edit-editor-wrap')!.innerHTML =
      `<p style="color:#ef4444;padding:16px">${t('memo.edit.error')}</p>`;
    return;
  }

  const { isImportant, blocks } = result.data;
  if (isImportant) {
    deleteBtn.style.display = 'none';
    backTarget = '/notes';
  }

  // ── TipTap 初期化 ────────────────────────────────────────
  const mountEl = app.querySelector<HTMLElement>('#editor-mount')!;

  editor = new Editor({
    element: mountEl,
    extensions: [
      StarterKit.configure({ heading: { levels: [1] } }),
      TaskList,
      TaskItem.configure({ nested: false }),
    ],
    content: blocksToTiptap(blocks) as JSONContent,
    onUpdate: () => scheduleSave(),
  });

  // テキスト領域より下をタップしたときにフォーカス
  app.querySelector('.edit-editor-wrap')!.addEventListener('click', (e) => {
    if (!(e.target as Element).closest('.ProseMirror')) {
      editor?.commands.focus('end');
    }
  });

  // ── ツールバー ───────────────────────────────────────────
  function updateToolbar(): void {
    app.querySelector('#tb-heading')!.classList.toggle('active', editor!.isActive('heading'));
    app.querySelector('#tb-bullet')! .classList.toggle('active', editor!.isActive('bulletList'));
    app.querySelector('#tb-ordered')!.classList.toggle('active', editor!.isActive('orderedList'));
    app.querySelector('#tb-task')!   .classList.toggle('active', editor!.isActive('taskList'));
  }

  editor.on('selectionUpdate', updateToolbar);
  editor.on('transaction',     updateToolbar);

  app.querySelector('#tb-heading')!.addEventListener('mousedown', (e) => {
    e.preventDefault();
    editor!.chain().focus().toggleHeading({ level: 1 }).run();
  });
  app.querySelector('#tb-bullet')!.addEventListener('mousedown', (e) => {
    e.preventDefault();
    editor!.chain().focus().toggleBulletList().run();
  });
  app.querySelector('#tb-ordered')!.addEventListener('mousedown', (e) => {
    e.preventDefault();
    editor!.chain().focus().toggleOrderedList().run();
  });
  app.querySelector('#tb-task')!.addEventListener('mousedown', (e) => {
    e.preventDefault();
    editor!.chain().focus().toggleTaskList().run();
  });

  // ── 削除ボタン ───────────────────────────────────────────
  deleteBtn.addEventListener('click', async () => {
    if (!confirm(t('memo.edit.deleteConfirm'))) return;
    const r = await memos.delete(memoId);
    if (r.success) { editor?.destroy(); navigate(`/notes/${noteId}`, true); }
    else alert(t('memo.edit.deleteError'));
  });

  // ── 自動保存 ─────────────────────────────────────────────
  function scheduleSave(): void {
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveStatus.textContent = t('memo.edit.editing');
    saveTimer = setTimeout(() => flush().catch(() => {}), 1500);
  }

  async function flush(): Promise<void> {
    saveTimer = null;
    if (!editor) return;
    saveStatus.textContent = t('memo.edit.saving');
    const payload = { blocks: tiptapToBlocks(editor.getJSON() as Record<string, unknown>) };
    const r = await memos.save(memoId, payload);
    saveStatus.textContent = r.success ? t('memo.edit.saved') : t('memo.edit.saveFail');
    setTimeout(() => { saveStatus.textContent = ''; }, 2000);
  }
}
