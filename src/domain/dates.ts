// 日期工具：统一使用本地时区的 YYYY-MM-DD 字符串，可直接按字典序比较

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function today(): string {
  return toDateString(new Date());
}

export function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/** 保修截止日是否仍有效（截止日当天视为有效） */
export function isWarrantyValid(warrantyUntil: string, onDate: string): boolean {
  return onDate <= warrantyUntil;
}
