/** Short list for the settings dropdown — not every IANA zone. */
export const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Athens',
  'Africa/Cairo',
  'Asia/Jerusalem',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
];

const FRIENDLY = {
  UTC: 'UTC',
  'America/New_York': 'US Eastern',
  'America/Chicago': 'US Central',
  'America/Denver': 'US Mountain',
  'America/Los_Angeles': 'US Pacific',
  'America/Phoenix': 'US Arizona (no DST)',
  'America/Anchorage': 'US Alaska',
  'Pacific/Honolulu': 'US Hawaii',
  'America/Toronto': 'Canada Eastern',
  'America/Vancouver': 'Canada Pacific',
};

export function timezoneLabel(zone) {
  const friendly = FRIENDLY[zone];
  return friendly ? `${friendly} (${zone})` : zone.replace(/_/g, ' ');
}

/** Curated options plus the saved value and browser zone if missing. */
export function timezoneOptions(current) {
  const zones = new Set(COMMON_TIMEZONES);
  if (current) zones.add(current);
  try {
    zones.add(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    // ignore
  }
  return [...zones].sort((a, b) => timezoneLabel(a).localeCompare(timezoneLabel(b)));
}
