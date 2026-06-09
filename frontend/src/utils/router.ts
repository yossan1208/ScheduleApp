// 画面IDとページモジュールのマッピング
type PageLoader = () => Promise<{ mount: (app: HTMLElement) => void }>;

const routes: Record<string, PageLoader> = {
  '/': () => import('../pages/login'),
  '/home': () => import('../pages/home'),
  '/day': () => import('../pages/day'),
};

export async function navigate(path: string): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  const pathname = path.split('?')[0];
  window.history.pushState(null, '', path);

  const loader = routes[pathname];
  if (!loader) {
    app.innerHTML = `<p>画面が見つかりません: ${pathname}</p>`;
    return;
  }

  const page = await loader();
  app.innerHTML = '';
  page.mount(app);
}

export function initRouter(): void {
  window.addEventListener('popstate', () =>
    navigate(location.pathname + location.search),
  );
}
