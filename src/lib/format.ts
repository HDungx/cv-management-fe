const number = new Intl.NumberFormat("vi-VN");

export function formatMoney(amount: number, currency: string): string {
  return `${number.format(amount)} ${currency}`;
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string,
): string {
  if (min != null && max != null) {
    return `${number.format(min)} – ${number.format(max)} ${currency}`;
  }
  if (min != null) return `Từ ${formatMoney(min, currency)}`;
  if (max != null) return `Đến ${formatMoney(max, currency)}`;
  return "—";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
