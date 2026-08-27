export function toDateTimeLocal(datetimeStr) {
  // convert DB/Backend datetime to HTML input datetime-local format
  if (!datetimeStr) return "";

  const d = new Date(datetimeStr);
  if (isNaN(d.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");

  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function toBackendDateTime(datetimeLocalStr) {
  // Convert HTML datetime-local to backend format "YYYY-MM-DD HH:MM:SS"
  if (!datetimeLocalStr) return null;

  // HTML gives: YYYY-MM-DDTHH:MM
  return datetimeLocalStr.replace("T", " ") + ":00";
}
