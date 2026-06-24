import { initRouter, navigate } from './utils/router';
import { applyThemeColor } from './utils/theme';

applyThemeColor(localStorage.getItem('themeColorHex'));
initRouter();
navigate(location.pathname + location.search);
