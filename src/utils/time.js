function nowIso() {
  return new Date().toISOString();
}

function addDaysIso(days, from = new Date()) {
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString();
}

function addHoursIso(hours, from = new Date()) {
  const date = new Date(from);
  date.setUTCHours(date.getUTCHours() + Number(hours || 0));
  return date.toISOString();
}

function olderThanDays(iso, days) {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() >= Number(days || 0) * 86400000;
}

function olderThanHours(iso, hours) {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() >= Number(hours || 0) * 3600000;
}

function minutesBetween(start, end = new Date()) {
  if (!start) return 0;
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

module.exports = { nowIso, addDaysIso, addHoursIso, olderThanDays, olderThanHours, minutesBetween };
