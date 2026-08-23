const LABELS = {
  ok: 'OK',
  due_today: 'Due today',
  overdue: 'Overdue',
};

export default function StatusBadge({ status }) {
  if (!status || status === 'ok') {
    return <span className="status-badge ok">{LABELS.ok}</span>;
  }
  return <span className={`status-badge ${status}`}>{LABELS[status] ?? status}</span>;
}
