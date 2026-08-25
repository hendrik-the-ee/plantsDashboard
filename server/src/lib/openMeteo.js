import { HttpError } from './errors.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

const DAILY_FIELDS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'weather_code',
].join(',');

/** Calendar YYYY-MM-DD in `timezone`, optionally shifted by whole days. */
export function calendarDateInTimezone(timezone, dayOffset = 0) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year').value);
  const month = Number(parts.find((part) => part.type === 'month').value);
  const day = Number(parts.find((part) => part.type === 'day').value);
  const shifted = new Date(Date.UTC(year, month - 1, day + dayOffset, 12));
  return shifted.toISOString().slice(0, 10);
}

export async function fetchForecast(latitude, longitude, { units = 'metric', timezone = 'UTC' } = {}) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: DAILY_FIELDS,
    forecast_days: '3',
    timezone,
  });

  if (units === 'imperial') {
    params.set('temperature_unit', 'fahrenheit');
    params.set('wind_speed_unit', 'mph');
    params.set('precipitation_unit', 'inch');
  }

  const [forecastRes, yesterday] = await Promise.all([
    fetch(`${FORECAST_URL}?${params}`),
    fetchYesterdayPrecip(latitude, longitude, { units, timezone }),
  ]);

  if (!forecastRes.ok) {
    throw new HttpError(502, 'Weather service unavailable');
  }

  const data = await forecastRes.json();
  if (!data.daily?.time?.length) {
    throw new HttpError(502, 'Weather service returned no forecast');
  }

  return {
    ...normalizeForecast(data, units),
    yesterday,
  };
}

async function fetchYesterdayPrecip(latitude, longitude, { units, timezone }) {
  const date = calendarDateInTimezone(timezone, -1);
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: date,
    end_date: date,
    daily: 'precipitation_sum',
    timezone,
  });

  if (units === 'imperial') {
    params.set('precipitation_unit', 'inch');
  }

  try {
    const res = await fetch(`${ARCHIVE_URL}?${params}`);
    if (!res.ok) return { date, precipAmount: null, source: 'archive', unavailable: true };

    const data = await res.json();
    if (data.error || !data.daily?.time?.length) {
      return { date, precipAmount: null, source: 'archive', unavailable: true };
    }

    return {
      date: data.daily.time[0],
      precipAmount: data.daily.precipitation_sum[0],
      source: 'archive',
    };
  } catch {
    return { date, precipAmount: null, source: 'archive', unavailable: true };
  }
}

/** Always millimetres — for watering credit math. */
export async function fetchYesterdayPrecipMm(latitude, longitude, { timezone = 'UTC' } = {}) {
  return fetchYesterdayPrecip(latitude, longitude, { units: 'metric', timezone });
}

function normalizeForecast(data, units) {
  const daily = data.daily;
  return {
    timezone: data.timezone,
    units,
    days: daily.time.map((date, index) => ({
      date,
      tempMax: daily.temperature_2m_max[index],
      tempMin: daily.temperature_2m_min[index],
      precipAmount: daily.precipitation_sum[index],
      precipProbability: daily.precipitation_probability_max[index],
      windMax: daily.wind_speed_10m_max[index],
      weatherCode: daily.weather_code[index],
    })),
  };
}
