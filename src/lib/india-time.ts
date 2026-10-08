export function indiaDayBounds(at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(at);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const utcMidnight = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day));
  const start = new Date(utcMidnight - 330 * 60_000);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60_000) };
}
