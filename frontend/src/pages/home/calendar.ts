import type { Schedule } from '../../api/schedules';
import { daysShort } from '../../utils/i18n';
const MAX_BARS = 3;

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildCalendarGrid(
  year: number,
  month: number,
  scheduleList: Schedule[],
): HTMLElement {
  const today    = new Date();
  const todayStr = formatDate(today);

  const firstDow   = new Date(year, month, 1).getDay();
  const lastDate   = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDow + lastDate) / 7) * 7;

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  // ヘッダー行
  daysShort().forEach((label, i) => {
    const cell = document.createElement('div');
    cell.className = `calendar-header-cell${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}`;
    cell.textContent = label;
    grid.appendChild(cell);
  });

  // 日付セル
  for (let i = 0; i < totalCells; i++) {
    const date           = new Date(year, month, i - firstDow + 1);
    const isCurrentMonth = date.getMonth() === month;
    const dateStr        = formatDate(date);
    const dow            = date.getDay();

    const cell = document.createElement('div');
    cell.className = `calendar-cell${isCurrentMonth ? '' : ' out-of-month'}`;
    if (isCurrentMonth) cell.dataset.date = dateStr;

    // 日付数字
    const dateEl = document.createElement('div');
    let dateClass = 'cell-date';
    if (dateStr === todayStr) {
      dateClass += ' today';
    } else if (dow === 0) {
      dateClass += ' sun';
    } else if (dow === 6) {
      dateClass += ' sat';
    }
    dateEl.className   = dateClass;
    dateEl.textContent = String(date.getDate());
    cell.appendChild(dateEl);

    // 予定バー（当月のみ）
    if (isCurrentMonth) {
      const daySchedules = scheduleList.filter(s => s.date === dateStr);

      daySchedules.slice(0, MAX_BARS).forEach(s => {
        const bar = document.createElement('div');
        bar.className = 'schedule-bar';
        bar.style.setProperty('--bar-color', s.genre?.colorHex ?? '#9E9E9E');
        bar.textContent = s.title;
        cell.appendChild(bar);
      });

      if (daySchedules.length > MAX_BARS) {
        const more = document.createElement('div');
        more.className   = 'schedule-more';
        more.textContent = `+${daySchedules.length - MAX_BARS}`;
        cell.appendChild(more);
      }
    }

    grid.appendChild(cell);
  }

  return grid;
}
