// 画面IDとページモジュールのマッピング
type PageLoader = () => Promise<{ mount: (app: HTMLElement) => void }>;

const routes: Record<string, PageLoader> = {
  '/': () => import('../pages/login'),
  '/home': () => import('../pages/home'),
  '/day': () => import('../pages/day'),
  '/week': () => import('../pages/week'),
  '/year': () => import('../pages/year'),
  '/schedule/new': () => import('../pages/schedule/new'),
  '/notes': () => import('../pages/notes'),
  '/notes/new': () => import('../pages/notes/form'),
  '/notes/archive': () => import('../pages/notes/archive'),
  '/settings': () => import('../pages/settings'),
  '/settings/profile': () => import('../pages/settings/profile'),
  '/settings/password': () => import('../pages/settings/password'),
  '/settings/notifications': () => import('../pages/settings/notifications'),
  '/settings/genres': () => import('../pages/settings/genres'),
  '/settings/genres/new': () => import('../pages/settings/genres/form'),
  '/settings/admin': () => import('../pages/settings/admin'),
  '/settings/admin/users': () => import('../pages/settings/admin/users'),
  '/settings/admin/users/new': () => import('../pages/settings/admin/users/form'),
  '/settings/admin/groups/new': () => import('../pages/settings/admin/groups/form'),
};

const dynamicRoutes: Array<{ pattern: RegExp; loader: PageLoader }> = [
  { pattern: /^\/settings\/genres\/\d+\/edit$/, loader: () => import('../pages/settings/genres/form') },
  { pattern: /^\/schedule\/\d+\/edit$/, loader: () => import('../pages/schedule/edit') },
  { pattern: /^\/schedule\/\d+$/,       loader: () => import('../pages/day') },
  { pattern: /^\/notes\/\d+\/edit$/,    loader: () => import('../pages/notes/form') },
  { pattern: /^\/notes\/\d+\/memos\/\d+$/, loader: () => import('../pages/notes/memos/edit') },
  { pattern: /^\/notes\/\d+$/,          loader: () => import('../pages/notes/memos') },
];

let popstateHook: ((path: string) => boolean) | null = null;

export function registerPopstateHook(hook: (path: string) => boolean): void {
  popstateHook = hook;
}

export function unregisterPopstateHook(): void {
  popstateHook = null;
}

export async function navigate(path: string, replace = false): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  const pathname = path.split('?')[0];
  if (replace) {
    window.history.replaceState(null, '', path);
  } else {
    window.history.pushState(null, '', path);
  }

  const loader = routes[pathname]
    ?? dynamicRoutes.find(r => r.pattern.test(pathname))?.loader;
  if (!loader) {
    app.innerHTML = `<p>画面が見つかりません: ${pathname}</p>`;
    return;
  }

  const page = await loader();
  app.innerHTML = '';
  page.mount(app);
}

export function initRouter(): void {
  window.addEventListener('popstate', () => {
    const path = location.pathname + location.search;
    if (popstateHook && popstateHook(path)) return;
    navigate(path, true);
  });
}
