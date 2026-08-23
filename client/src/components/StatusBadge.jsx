const LABELS = {
  ok: 'Watered',
  due_today: 'Water today',
  overdue: 'Watering Overdue',
};

export default function StatusBadge({ status }) {
  if (!status || status === 'ok') {
    return <span className="status-badge ok">{LABELS.ok}</span>;
  }
  return <span className={`status-badge ${status}`}>{LABELS[status] ?? status}</span>;
}
