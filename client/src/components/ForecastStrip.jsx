function weatherLabel(code) {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Cloudy';
  if (code <= 48) return 'Fog';
  if (code <= 55) return 'Drizzle';
  if (code <= 65) return 'Rain';
  if (code <= 75) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Mixed';
}

function dayHeading(dateString, index, timezone) {
  if (index === 0) return 'Today';
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  }).format(date);
}

function tempUnit(units) {
  return units === 'imperial' ? '°F' : '°C';
}

function precipUnit(units) {
  return units === 'imperial' ? 'in' : 'mm';
}

function windUnit(units) {
  return units === 'imperial' ? 'mph' : 'km/h';
}

function yesterdayRainLabel(yesterday, units) {
  if (!yesterday) return null;
  if (yesterday.precipAmount == null || yesterday.unavailable) {
    return 'Yesterday’s rainfall is not available yet';
  }
  const amount = Number(yesterday.precipAmount).toFixed(1);
  const unit = precipUnit(units);
  return `It rained ${amount} ${unit} yesterday`;
}

export default function ForecastStrip({ weather }) {
  const { days, timezone, units, stale, yesterday } = weather;
  const yesterdayRain = yesterdayRainLabel(yesterday, units);

  return (
    <section className="card forecast-panel">
      <div className="forecast-header">
        <div>
          <h2>3-day forecast</h2>
          <p className="muted">
            Garden location {weather.location.latitude.toFixed(4)},{' '}
            {weather.location.longitude.toFixed(4)}
            {stale ? ' · showing cached forecast' : ''}
          </p>
          {yesterdayRain && <p className="forecast-yesterday">{yesterdayRain}</p>}
        </div>
      </div>

      <div className="forecast-strip">
        {days.map((day, index) => (
          <article key={day.date} className="forecast-day">
            <p className="forecast-day-label">{dayHeading(day.date, index, timezone)}</p>
            <p className="forecast-condition">{weatherLabel(day.weatherCode)}</p>
            <p className="forecast-temps">
              Hi {Math.round(day.tempMax)}
              {tempUnit(units)} / Low {Math.round(day.tempMin)}
              {tempUnit(units)}
            </p>
            <p className="forecast-meta">
              {Math.round(day.precipProbability ?? 0)}% chance rain,{' '}
              {day.precipAmount?.toFixed(1) ?? 0}
              {precipUnit(units)}
            </p>
            <p className="forecast-meta">
              Max wind {Math.round(day.windMax ?? 0)} {windUnit(units)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
