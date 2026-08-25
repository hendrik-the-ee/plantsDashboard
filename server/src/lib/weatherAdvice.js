// Thresholds are starting guesses; tune once real forecasts are visible.
export const RAIN_PRECIP_MM = 2;
export const RAIN_PRECIP_IN = 0.08;
export const RAIN_PROBABILITY = 50;
export const HOT_TEMP_C = 32;
export const HOT_TEMP_F = 90;
export const FROST_TEMP_C = 2;
export const FROST_TEMP_F = 35;
export const HIGH_WIND_KMH = 40;
export const HIGH_WIND_MPH = 25;

function rainThreshold(units) {
  return units === 'imperial' ? RAIN_PRECIP_IN : RAIN_PRECIP_MM;
}

function hotThreshold(units) {
  return units === 'imperial' ? HOT_TEMP_F : HOT_TEMP_C;
}

function frostThreshold(units) {
  return units === 'imperial' ? FROST_TEMP_F : FROST_TEMP_C;
}

function windThreshold(units) {
  return units === 'imperial' ? HIGH_WIND_MPH : HIGH_WIND_KMH;
}

function isRainyDay(day, units) {
  const precipThreshold = rainThreshold(units);
  return (
    (day.precipAmount ?? 0) >= precipThreshold ||
    (day.precipProbability ?? 0) >= RAIN_PROBABILITY
  );
}

function formatDateLabel(dateString, index, timezone) {
  if (index === 0) return 'today';
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: timezone,
  }).format(date);
}

function plantsDueSoon(plants, dayDates) {
  const dueDates = new Set(dayDates);
  return plants.filter(
    (plant) =>
      plant.water_status === 'overdue' ||
      plant.water_status === 'due_today' ||
      (plant.next_water_due && dueDates.has(plant.next_water_due)),
  );
}

/**
 * @param {{ days: object[], plants: object[], timezone: string, units: string }} input
 * @returns {{ key: string, severity: string, title: string, reason: string, action: string, plantIds?: number[] }[]}
 */
export function buildWeatherAdvisories({ days, plants, timezone, units }) {
  const advisories = [];
  if (!days?.length) return advisories;

  const activePlants = plants.filter((plant) => !plant.archived_at);
  const containerPlants = activePlants.filter((plant) => plant.container_size_liters != null);

  const rainyWindow = days.slice(0, 2);
  if (rainyWindow.some((day) => isRainyDay(day, units))) {
    const dueDates = rainyWindow.map((day) => day.date);
    const duePlants = plantsDueSoon(activePlants, dueDates);
    if (duePlants.length > 0) {
      advisories.push({
        key: 'weather:rain_defer_water',
        severity: 'info',
        title: 'Rain expected — defer watering',
        reason: `Meaningful rain is forecast within the next 48 hours (${rainyWindow.map((day, index) => formatDateLabel(day.date, index, timezone)).join(', ')}).`,
        action: `Skip or delay watering for ${duePlants.length} plant${duePlants.length === 1 ? '' : 's'} due in that window.`,
        plantIds: duePlants.map((plant) => plant.id),
      });
    }
  }

  const hotDay = days.find((day) => (day.tempMax ?? -Infinity) >= hotThreshold(units));
  if (hotDay) {
    const hotIndex = days.indexOf(hotDay);
    const label = formatDateLabel(hotDay.date, hotIndex, timezone);
    const containerNote =
      containerPlants.length > 0
        ? ` Pay extra attention to ${containerPlants.length} container plant${containerPlants.length === 1 ? '' : 's'} — pots dry out faster.`
        : '';
    advisories.push({
      key: 'weather:heat',
      severity: 'medium',
      title: 'Hot day ahead',
      reason: `High near ${Math.round(hotDay.tempMax)}° on ${label}.`,
      action: `Water early in the morning and shade containers if possible.${containerNote}`,
    });
  }

  const frostDay = days.find((day) => (day.tempMin ?? Infinity) <= frostThreshold(units));
  if (frostDay) {
    const frostIndex = days.indexOf(frostDay);
    const label = formatDateLabel(frostDay.date, frostIndex, timezone);
    advisories.push({
      key: 'weather:frost',
      severity: 'high',
      title: 'Frost risk',
      reason: `Low near ${Math.round(frostDay.tempMin)}° on ${label}.`,
      action: 'Cover or move tender plants indoors before nightfall.',
    });
  }

  const windyDay = days.find((day) => (day.windMax ?? 0) >= windThreshold(units));
  if (windyDay) {
    const windIndex = days.indexOf(windyDay);
    const label = formatDateLabel(windyDay.date, windIndex, timezone);
    advisories.push({
      key: 'weather:wind',
      severity: 'low',
      title: 'Strong wind expected',
      reason: `Max wind up to ${Math.round(windyDay.windMax)} ${units === 'imperial' ? 'mph' : 'km/h'} on ${label}.`,
      action: 'Stake tall plants and secure loose containers.',
    });
  }

  return advisories;
}
