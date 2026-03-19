// time
export function formatThaiDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function formatThaiDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
  });
}

// translate