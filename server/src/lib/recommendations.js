const STALE_DAYS = 30;
const REPOT_YEARS_PER_LITER = 0.5;
const CONTAINER_WATER_RATIO_WARN = 0.05;

function daysBetween(from, to) {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function localToday(timezone) {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

function formatAnalysisDate(completedAt, timezone) {
  if (!completedAt) return 'unknown date';
  return new Date(completedAt).toLocaleDateString('en-CA', { timeZone: timezone });
}

export function buildRecommendations({
  plants,
  eventsByPlant,
  dismissals,
  weatherAdvisories = [],
  visionFindings = [],
  timezone = 'UTC',
}) {
  const today = localToday(timezone);
  const dismissed = new Map(
    dismissals.map((row) => [row.key, row.snooze_until ? new Date(row.snooze_until) : null]),
  );
  const items = [];

  function isDismissed(key) {
    const snoozeUntil = dismissed.get(key);
    if (!snoozeUntil) return dismissed.has(key);
    return snoozeUntil.getTime() > Date.now();
  }

  function push(item) {
    if (isDismissed(item.key)) return;
    items.push(item);
  }

  for (const plant of plants) {
    if (plant.archived_at) continue;

    if (plant.water_status === 'overdue') {
      push({
        key: `water_overdue:${plant.id}`,
        plantId: plant.id,
        severity: 'high',
        title: `Water ${plant.name}`,
        reason: `Overdue since ${plant.next_water_due}`,
        action: 'water',
      });
    } else if (plant.water_status === 'due_today') {
      push({
        key: `water_due:${plant.id}`,
        plantId: plant.id,
        severity: 'medium',
        title: `Water ${plant.name} today`,
        reason: 'Scheduled watering is due today',
        action: 'water',
      });
    }

    const plantEvents = eventsByPlant.get(plant.id) ?? [];
    const lastFertilize = plantEvents.find((event) => event.type === 'fertilize');
    if (plant.fertilize_interval_days) {
      const daysSince = lastFertilize
        ? daysBetween(lastFertilize.occurred_at, today)
        : Infinity;
      if (daysSince >= plant.fertilize_interval_days) {
        push({
          key: `fertilize_due:${plant.id}`,
          plantId: plant.id,
          severity: daysSince > plant.fertilize_interval_days + 7 ? 'high' : 'medium',
          title: `Fertilize ${plant.name}`,
          reason: lastFertilize
            ? `Last fertilized ${daysSince} days ago`
            : 'No fertilizing logged yet',
          action: 'fertilize',
        });
      }
    }

    const lastRepot = plantEvents.find((event) => event.type === 'repot');
    if (plant.container_size_liters) {
      const repotIntervalDays = Math.round(
        Number(plant.container_size_liters) * REPOT_YEARS_PER_LITER * 365,
      );
      const daysSinceRepot = lastRepot ? daysBetween(lastRepot.occurred_at, today) : Infinity;
      if (daysSinceRepot >= repotIntervalDays) {
        push({
          key: `repot_due:${plant.id}`,
          plantId: plant.id,
          severity: 'low',
          title: `Consider repotting ${plant.name}`,
          reason: `Container ${plant.container_size_liters} L may need refreshing`,
          action: 'repot',
        });
      }
    }

    const waterEvents = plantEvents.filter((event) => event.type === 'water');
    if (
      plant.container_size_liters &&
      waterEvents.length >= 3 &&
      waterEvents.every(
        (event) =>
          event.amount_ml != null &&
          event.amount_ml < Number(plant.container_size_liters) * 1000 * CONTAINER_WATER_RATIO_WARN,
      )
    ) {
      push({
        key: `water_amount_low:${plant.id}`,
        plantId: plant.id,
        severity: 'low',
        title: `Check watering amount for ${plant.name}`,
        reason: 'Recent water logs look small for the container size',
        action: 'review_water',
      });
    }

    const lastAny = plantEvents[0];
    if (!lastAny || daysBetween(lastAny.occurred_at, today) > STALE_DAYS) {
      push({
        key: `stale:${plant.id}`,
        plantId: plant.id,
        severity: 'low',
        title: `Check in on ${plant.name}`,
        reason: `No care logged in over ${STALE_DAYS} days`,
        action: 'observe',
      });
    }

    if (plant.planted_on && plant.days_to_maturity) {
      const planted = new Date(plant.planted_on);
      const harvest = new Date(planted);
      harvest.setDate(harvest.getDate() + plant.days_to_maturity);
      const daysUntil = daysBetween(today, harvest.toISOString().slice(0, 10));
      if (daysUntil >= 0 && daysUntil <= 14) {
        push({
          key: `harvest_window:${plant.id}`,
          plantId: plant.id,
          severity: daysUntil <= 3 ? 'medium' : 'low',
          title: `Harvest window for ${plant.name}`,
          reason: `Estimated ready in ${daysUntil} days`,
          action: 'harvest',
        });
      }
    }
  }

  for (const advisory of weatherAdvisories) {
    push({
      key: advisory.key,
      plantId: advisory.plantId ?? null,
      severity: advisory.severity ?? 'medium',
      title: advisory.title,
      reason: advisory.reason,
      action: advisory.action ?? 'weather',
    });
  }

  for (const finding of visionFindings) {
    if (finding.severity === 'info') continue;
    const analysisDate = formatAnalysisDate(finding.analysis_completed_at, timezone);
    const source = `photo analysis from ${analysisDate}: `;
    push({
      key: `vision:${finding.id}`,
      plantId: finding.plant_id,
      severity: finding.severity,
      title: `${finding.plant_name}: ${finding.issue.replace(/_/g, ' ')}`,
      reason: `${source}${finding.recommendation}`,
      action: 'diagnosis',
    });
  }

  const severityRank = { high: 0, medium: 1, low: 2, info: 3 };
  return items.sort(
    (a, b) =>
      (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9) ||
      a.title.localeCompare(b.title),
  );
}
