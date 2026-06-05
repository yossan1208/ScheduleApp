// 画面IDとページモジュールのマッピング
type PageLoader = () => Promise<{ mount: (app: HTMLElement) => void }>;

const routes: Record<string, PageLoader> = {
  // 各画面は pages/ 以下に追加していく
  // '/':        () => import('../pages/login'),
  // '/home':    () => import('../pages/home'),
};

export async function navigate(path: string): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  const loader = routes[path];
  if (!loader) {
    app.innerHTML = `<p>画面が見つかりません: ${path}</p>`;
    return;
  }

  const page = await loader();
  app.innerHTML = '';
  page.mount(app);

  window.history.pushState(null, '', path);
}

export function initRouter(): void {
  window.addEventListener('popstate', () => navigate(location.pathname));
}
