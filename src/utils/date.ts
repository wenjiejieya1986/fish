export function getLastMonthDateRange(): { startTime: number; endTime: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const lastMonthDate = new Date(year, month - 1, 1);
  const startTime = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1, 0, 0, 0);
  const endTime = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0, 23, 59, 59);

  return {
    startTime: startTime.getTime(),
    endTime: endTime.getTime(),
  };
}

export function getLastMonthName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const lastMonthDate = new Date(year, month - 1, 1);
  const yearStr = lastMonthDate.getFullYear().toString();
  const monthStr = (lastMonthDate.getMonth() + 1).toString().padStart(2, '0');

  return `${yearStr}年${monthStr}月`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): number {
  const date = new Date(dateStr);
  return date.getTime();
}
