type Lang = 'ja' | 'en';

let currentLang: Lang = (localStorage.getItem('language') as Lang) ?? 'ja';

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  localStorage.setItem('language', lang);
}

// ─── 日付配列 ──────────────────────────────────────────────────────────
const MONTHS_JA       = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const MONTHS_EN       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_EN_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const DAYS_SHORT_JA = ['日','月','火','水','木','金','土'];
const DAYS_SHORT_EN = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const DAYS_LONG_JA  = ['日曜日','月曜日','火曜日','水曜日','木曜日','金曜日','土曜日'];
const DAYS_LONG_EN  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export function months(): string[] {
  return currentLang === 'ja' ? MONTHS_JA : MONTHS_EN;
}

export function daysShort(): string[] {
  return currentLang === 'ja' ? DAYS_SHORT_JA : DAYS_SHORT_EN;
}

export function daysLong(): string[] {
  return currentLang === 'ja' ? DAYS_LONG_JA : DAYS_LONG_EN;
}

/** year/month は 1-indexed */
export function fmtYearMonth(year: number, month: number): string {
  return currentLang === 'ja'
    ? `${year}年${month}月`
    : `${MONTHS_EN[month - 1]} ${year}`;
}

/** month は 1-indexed */
export function fmtMonthLabel(month: number): string {
  return currentLang === 'ja' ? `${month}月` : MONTHS_EN_SHORT[month - 1];
}

export function fmtFullDate(date: Date): string {
  const y   = date.getFullYear();
  const m   = date.getMonth() + 1;
  const d   = date.getDate();
  const dow = date.getDay();
  return currentLang === 'ja'
    ? `${y}年${m}月${d}日(${DAYS_SHORT_JA[dow]})`
    : `${DAYS_SHORT_EN[dow]}, ${MONTHS_EN_SHORT[m - 1]} ${d}, ${y}`;
}

/** +N件 / +N more */
export function fmtCountBadge(n: number): string {
  return currentLang === 'ja' ? `+${n}件` : `+${n} more`;
}

// ─── 文言辞書 ──────────────────────────────────────────────────────────
const dict: Record<Lang, Record<string, string>> = {
  ja: {
    // Common
    'common.loading':       '読み込み中…',
    'common.error.fetch':   'データの取得に失敗しました',
    'common.error.network': '通信エラーが発生しました',
    'common.error.save':    '保存に失敗しました',
    'common.allDay':        '終日',

    // Login
    'login.id':              'ID',
    'login.password':        'パスワード',
    'login.submit':          'ログイン',
    'login.error.invalid':   'IDまたはパスワードが違います',
    'login.error.disabled':  'アカウントが無効です',
    'login.error.noGroup':   'グループに加入してください',
    'login.error.generic':   'ログインに失敗しました',

    // Home
    'home.error': '予定を取得できませんでした',

    // Day
    'day.empty':         '予定なし',
    'day.deleteBtn':     '削除',
    'day.deleteConfirm': 'この予定を削除しますか？',
    'day.fetchError':    '予定を取得できませんでした',
    'day.sheetError':    '取得に失敗しました',
    'day.self':          '自分',
    'day.other':         '他のメンバー',

    // Schedule new/edit
    'schedule.new.title':          '予定追加',
    'schedule.edit.title':         '予定編集',
    'schedule.label.title':        'タイトル',
    'schedule.label.genre':        'ジャンル',
    'schedule.label.date':         '日付',
    'schedule.label.startTime':    '開始',
    'schedule.label.endTime':      '終了',
    'schedule.label.visibility':   '公開設定',
    'schedule.label.memo':         '詳細メモ',
    'schedule.label.notif':        '通知',
    'schedule.genre.placeholder':  'ジャンルを選択',
    'schedule.visibility.public':  '公開',
    'schedule.visibility.private': '非公開',
    'schedule.allDay':             '終日',
    'schedule.notif.none':         'なし',
    'schedule.notif.atTime':       '予定時刻',
    'schedule.notif.before':       '分前',
    'schedule.save':               '保存する',
    'schedule.delete':             '削除する',
    'schedule.memo.add':           '📝 詳細メモを追加…',
    'schedule.error.noTitle':      'タイトルを入力してください',
    'schedule.error.noGenre':      'ジャンルを選択してください',
    'schedule.error.noGenreList':  'ジャンルがまだ作成されていません',
    'schedule.error.fetchGenre':   'ジャンルを取得できませんでした',
    'schedule.history.empty':      '履歴がありません',
    'schedule.history.loading':    '読み込み中…',
    'schedule.history.error':      '取得に失敗しました',

    // Notes
    'notes.title':    '共有事項',
    'notes.new':      '+ 新規',
    'notes.archive':  'アーカイブ',
    'notes.empty':    'ノートがありません',
    'notes.error':    'ノートを取得できませんでした',

    // Notes form
    'notes.form.createTitle':   'ノートを作成',
    'notes.form.editTitle':     'ノートを編集',
    'notes.form.label':         'ノート名',
    'notes.form.placeholder':   'ノート名を入力',
    'notes.form.submit.create': '作成する',
    'notes.form.submit.edit':   '更新する',
    'notes.form.error.empty':   'ノート名を入力してください',
    'notes.form.error.save':    '保存に失敗しました',

    // Notes archive
    'notes.archive.title':         'アーカイブ',
    'notes.archive.empty':         'アーカイブされたノートはありません',
    'notes.archive.error':         '取得できませんでした',
    'notes.archive.deleteConfirm': 'このノートを完全に削除しますか？この操作は取り消せません。',
    'notes.archive.deleteError':   '削除に失敗しました',

    // Memos
    'memos.archiveConfirm': 'このノートをアーカイブに移動しますか？',
    'memos.archiveError':   'アーカイブに失敗しました',
    'memos.createError':    'メモの作成に失敗しました',
    'memos.empty':          'メモがありません',
    'memos.error':          'メモを取得できませんでした',
    'memos.noTitle':        '（タイトルなし）',

    // Memo edit
    'memo.edit.error':         'メモを取得できませんでした',
    'memo.edit.deleteConfirm': 'このメモを削除しますか？',
    'memo.edit.deleteError':   '削除に失敗しました',
    'memo.edit.saving':        '保存中…',
    'memo.edit.saved':         '保存しました',
    'memo.edit.saveFail':      '保存に失敗',
    'memo.edit.editing':       '編集中…',

    // Settings hub
    'settings.title':              'Settings',
    'settings.menu.profile':       '個人用設定',
    'settings.menu.notifications': '通知設定',
    'settings.menu.genres':        'ジャンル一覧',
    'settings.menu.password':      'パスワード設定',
    'settings.menu.admin':         '管理者用設定',

    // Profile
    'profile.title':               '個人設定',
    'profile.label.name':          '名前',
    'profile.label.personalColor': '個人カラー',
    'profile.label.themeColor':    'テーマカラー',
    'profile.label.language':      '言語',
    'profile.lang.ja':             '日本語',
    'profile.lang.en':             'English',
    'profile.save':                '設定する',
    'profile.saved':               '設定を保存しました',
    'profile.error.noName':        '名前を入力してください',
    'profile.error.noPersonal':    '個人カラーを選択してください',
    'profile.error.noTheme':       'テーマカラーを選択してください',
    'profile.error.colorConflict': '選択した個人カラーは、すでにジャンルで使用されています',
    'profile.error.save':          '更新に失敗しました',
    'profile.placeholder.name':    '名前を入力',

    // Password
    'password.title':                  'パスワード設定',
    'password.placeholder.current':    '古いパスワードを入力',
    'password.placeholder.new':        '新しいパスワードを入力',
    'password.placeholder.confirm':    '確認用',
    'password.save':                   '設定する',
    'password.error.empty':            'すべてのフィールドを入力してください',
    'password.error.mismatch':         '現在のパスワードが正しくありません',
    'password.error.confirmMismatch':  '新しいパスワードと確認用が一致しません',
    'password.error.generic':          'エラーが発生しました',
    'password.saved':                  'パスワードを変更しました',

    // Notifications
    'notif.title':              '通知設定',
    'notif.empty':              'ジャンルがまだ作成されていません',
    'notif.error':              '設定の取得に失敗しました',

    // Genres
    'genres.title':  'ジャンル一覧',
    'genres.add':    '+ 新規追加する',
    'genres.empty':  'ジャンルがまだ作成されていません',
    'genres.error':  'データの取得に失敗しました',

    // Genre form
    'genres.form.createTitle':     'ジャンル作成',
    'genres.form.editTitle':       'ジャンル編集',
    'genres.form.label.name':      'ジャンル名',
    'genres.form.label.color':     'カラー',
    'genres.form.submit.create':   '作成する',
    'genres.form.submit.edit':     '更新する',
    'genres.form.delete':          '削除する',
    'genres.form.error.noName':    'ジャンル名を入力してください',
    'genres.form.error.noColor':   'カラーを選択してください',
    'genres.form.error.conflict':  'このジャンル名はすでに使われています',
    'genres.form.error.save':      '保存に失敗しました',
    'genres.form.error.delete':    '削除に失敗しました',
    'genres.form.deleteConfirm':   'このジャンルを削除しますか？',
    'genres.form.fetchError':      '取得に失敗しました',

    // Admin hub
    'admin.title':          '管理者設定',
    'admin.menu.users':     'ユーザー管理',
    'admin.menu.groups':    'グループ作成',

    // Admin users
    'admin.users.title':          'ユーザー管理',
    'admin.users.new':            '＋ 新規',
    'admin.users.empty':          'ユーザーがいません',
    'admin.users.deactivate':     '無効化',
    'admin.users.deactivated':    '無効化済み',
    'admin.users.error':          '読み込みに失敗しました',
    'admin.users.deactivateError':'無効化に失敗しました',
    'admin.users.role.admin':     '管理者',
    'admin.users.role.gl':        'GL',
    'admin.users.role.general':   '一般',

    // Admin user form
    'admin.user.form.title':                   'アカウント作成',
    'admin.user.form.loginId':                 'Login ID',
    'admin.user.form.name':                    '名前',
    'admin.user.form.password':                '初期パスワード',
    'admin.user.form.role':                    'ロール',
    'admin.user.form.submit':                  '作成する',
    'admin.user.form.error.loginIdConflict':   'このLoginIdはすでに使われています',
    'admin.user.form.error.generic':           '作成に失敗しました',
    'admin.user.form.error.required':          'すべての項目を入力してください',

    // Admin group form
    'admin.group.form.title':            'グループ作成',
    'admin.group.form.name':             'グループ名',
    'admin.group.form.members':          'メンバー選択',
    'admin.group.form.noUsers':          'グループ未所属のユーザーがいません',
    'admin.group.form.submit':           '作成する',
    'admin.group.form.error.noName':     'グループ名を入力してください',
    'admin.group.form.error.noMember':   'メンバーを1人以上選択してください',
    'admin.group.form.error.save':       '作成に失敗しました',
  },

  en: {
    // Common
    'common.loading':       'Loading…',
    'common.error.fetch':   'Failed to load data',
    'common.error.network': 'Network error',
    'common.error.save':    'Failed to save',
    'common.allDay':        'All day',

    // Login
    'login.id':              'ID',
    'login.password':        'Password',
    'login.submit':          'Login',
    'login.error.invalid':   'Invalid ID or password',
    'login.error.disabled':  'Account is disabled',
    'login.error.noGroup':   'Please join a group',
    'login.error.generic':   'Login failed',

    // Home
    'home.error': 'Failed to load schedules',

    // Day
    'day.empty':         'No schedules',
    'day.deleteBtn':     'Delete',
    'day.deleteConfirm': 'Delete this schedule?',
    'day.fetchError':    'Failed to load schedules',
    'day.sheetError':    'Failed to load',
    'day.self':          'Me',
    'day.other':         'Others',

    // Schedule new/edit
    'schedule.new.title':          'Add Schedule',
    'schedule.edit.title':         'Edit Schedule',
    'schedule.label.title':        'Title',
    'schedule.label.genre':        'Genre',
    'schedule.label.date':         'Date',
    'schedule.label.startTime':    'Start',
    'schedule.label.endTime':      'End',
    'schedule.label.visibility':   'Visibility',
    'schedule.label.memo':         'Notes',
    'schedule.label.notif':        'Notification',
    'schedule.genre.placeholder':  'Select Genre',
    'schedule.visibility.public':  'Public',
    'schedule.visibility.private': 'Private',
    'schedule.allDay':             'All day',
    'schedule.notif.none':         'None',
    'schedule.notif.atTime':       'At time',
    'schedule.notif.before':       'min before',
    'schedule.save':               'Save',
    'schedule.delete':             'Delete',
    'schedule.memo.add':           '📝 Add notes…',
    'schedule.error.noTitle':      'Please enter a title',
    'schedule.error.noGenre':      'Please select a genre',
    'schedule.error.noGenreList':  'No genres created yet',
    'schedule.error.fetchGenre':   'Failed to load genres',
    'schedule.history.empty':      'No history',
    'schedule.history.loading':    'Loading…',
    'schedule.history.error':      'Failed to load',

    // Notes
    'notes.title':    'Shared Notes',
    'notes.new':      '+ New',
    'notes.archive':  'Archive',
    'notes.empty':    'No notes',
    'notes.error':    'Failed to load notes',

    // Notes form
    'notes.form.createTitle':   'Create Note',
    'notes.form.editTitle':     'Edit Note',
    'notes.form.label':         'Note name',
    'notes.form.placeholder':   'Enter note name',
    'notes.form.submit.create': 'Create',
    'notes.form.submit.edit':   'Update',
    'notes.form.error.empty':   'Please enter a note name',
    'notes.form.error.save':    'Failed to save',

    // Notes archive
    'notes.archive.title':         'Archive',
    'notes.archive.empty':         'No archived notes',
    'notes.archive.error':         'Failed to load',
    'notes.archive.deleteConfirm': 'Permanently delete this note? This cannot be undone.',
    'notes.archive.deleteError':   'Failed to delete',

    // Memos
    'memos.archiveConfirm': 'Move this note to archive?',
    'memos.archiveError':   'Failed to archive',
    'memos.createError':    'Failed to create memo',
    'memos.empty':          'No memos',
    'memos.error':          'Failed to load memos',
    'memos.noTitle':        '(No title)',

    // Memo edit
    'memo.edit.error':         'Failed to load memo',
    'memo.edit.deleteConfirm': 'Delete this memo?',
    'memo.edit.deleteError':   'Failed to delete',
    'memo.edit.saving':        'Saving…',
    'memo.edit.saved':         'Saved',
    'memo.edit.saveFail':      'Save failed',
    'memo.edit.editing':       'Editing…',

    // Settings hub
    'settings.title':              'Settings',
    'settings.menu.profile':       'Personal Settings',
    'settings.menu.notifications': 'Notifications',
    'settings.menu.genres':        'Genres',
    'settings.menu.password':      'Password',
    'settings.menu.admin':         'Admin Settings',

    // Profile
    'profile.title':               'Personal Settings',
    'profile.label.name':          'Name',
    'profile.label.personalColor': 'Personal Color',
    'profile.label.themeColor':    'Theme Color',
    'profile.label.language':      'Language',
    'profile.lang.ja':             '日本語',
    'profile.lang.en':             'English',
    'profile.save':                'Save',
    'profile.saved':               'Settings saved',
    'profile.error.noName':        'Please enter a name',
    'profile.error.noPersonal':    'Please select a personal color',
    'profile.error.noTheme':       'Please select a theme color',
    'profile.error.colorConflict': 'The selected personal color is already used by a genre',
    'profile.error.save':          'Failed to update',
    'profile.placeholder.name':    'Enter your name',

    // Password
    'password.title':                 'Password',
    'password.placeholder.current':   'Current password',
    'password.placeholder.new':       'New password',
    'password.placeholder.confirm':   'Confirm',
    'password.save':                  'Change',
    'password.error.empty':           'Please fill in all fields',
    'password.error.mismatch':        'Current password is incorrect',
    'password.error.confirmMismatch': 'New passwords do not match',
    'password.error.generic':         'An error occurred',
    'password.saved':                 'Password changed',

    // Notifications
    'notif.title':  'Notifications',
    'notif.empty':  'No genres to configure',
    'notif.error':  'Failed to load settings',

    // Genres
    'genres.title':  'Genres',
    'genres.add':    '+ Add new',
    'genres.empty':  'No genres created yet',
    'genres.error':  'Failed to load data',

    // Genre form
    'genres.form.createTitle':     'Create Genre',
    'genres.form.editTitle':       'Edit Genre',
    'genres.form.label.name':      'Genre name',
    'genres.form.label.color':     'Color',
    'genres.form.submit.create':   'Create',
    'genres.form.submit.edit':     'Update',
    'genres.form.delete':          'Delete',
    'genres.form.error.noName':    'Please enter a genre name',
    'genres.form.error.noColor':   'Please select a color',
    'genres.form.error.conflict':  'This genre name is already in use',
    'genres.form.error.save':      'Failed to save',
    'genres.form.error.delete':    'Failed to delete',
    'genres.form.deleteConfirm':   'Delete this genre?',
    'genres.form.fetchError':      'Failed to load',

    // Admin hub
    'admin.title':          'Admin Settings',
    'admin.menu.users':     'User Management',
    'admin.menu.groups':    'Create Group',

    // Admin users
    'admin.users.title':          'User Management',
    'admin.users.new':            '+ New',
    'admin.users.empty':          'No users',
    'admin.users.deactivate':     'Deactivate',
    'admin.users.deactivated':    'Deactivated',
    'admin.users.error':          'Failed to load',
    'admin.users.deactivateError':'Failed to deactivate',
    'admin.users.role.admin':     'Admin',
    'admin.users.role.gl':        'GL',
    'admin.users.role.general':   'General',

    // Admin user form
    'admin.user.form.title':                   'Create Account',
    'admin.user.form.loginId':                 'Login ID',
    'admin.user.form.name':                    'Name',
    'admin.user.form.password':                'Initial Password',
    'admin.user.form.role':                    'Role',
    'admin.user.form.submit':                  'Create',
    'admin.user.form.error.loginIdConflict':   'This Login ID is already taken',
    'admin.user.form.error.generic':           'Failed to create account',
    'admin.user.form.error.required':          'Please fill in all fields',

    // Admin group form
    'admin.group.form.title':            'Create Group',
    'admin.group.form.name':             'Group name',
    'admin.group.form.members':          'Select members',
    'admin.group.form.noUsers':          'No ungrouped users available',
    'admin.group.form.submit':           'Create',
    'admin.group.form.error.noName':     'Please enter a group name',
    'admin.group.form.error.noMember':   'Please select at least one member',
    'admin.group.form.error.save':       'Failed to create group',
  },
};

export function t(key: string): string {
  return dict[currentLang][key] ?? dict['ja'][key] ?? key;
}
