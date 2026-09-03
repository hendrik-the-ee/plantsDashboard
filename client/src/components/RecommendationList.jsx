import WaterButton from './WaterButton.jsx';

const severityClass = {
  high: 'advisory-high',
  medium: 'advisory-medium',
  low: 'advisory-info',
};

export default function RecommendationList({
  items,
  loading,
  error,
  onDismiss,
  plantsById = {},
  onWatered,
}) {
  if (loading) return <p className="muted">Loading recommendations…</p>;
  if (error) return <p className="bad">{error.message}</p>;
  if (!items.length) {
    return <p className="muted">Nothing urgent right now — your garden looks on track.</p>;
  }

  return (
    <ul className="advisory-list">
      {items.map((item) => {
        const plant = item.action === 'water' && item.plantId != null
          ? plantsById[item.plantId]
          : null;

        return (
          <li key={item.key} className={`advisory-item ${severityClass[item.severity] ?? ''}`}>
            <strong>{item.title}</strong>
            <span>{item.reason}</span>
            <div className="advisory-actions">
              <div className="button-row">
                <button type="button" className="button secondary" onClick={() => onDismiss(item.key)}>
                  Dismiss
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => onDismiss(item.key, 7)}
                >
                  Snooze 7 days
                </button>
              </div>
              {plant && (
                <WaterButton
                  plant={plant}
                  onWatered={() => onWatered?.(plant.id)}
                  editTo={`/plants/${plant.id}#log-event`}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
