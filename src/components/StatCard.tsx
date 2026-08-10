interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly detail?: string;
}

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {detail && <p className="stat-detail">{detail}</p>}
    </div>
  );
}
