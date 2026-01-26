interface MetricCardProps {
  label: string;
  value: string;
  total?: string;
  percentage: number;
  detail?: string;
  color?: 'cyan' | 'green' | 'yellow' | 'red';
}

export function MetricCard({ label, value, total, percentage, detail, color = 'cyan' }: MetricCardProps) {
  const colorClasses = {
    cyan: 'bg-cyan-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="space-y-1.5">
      <div className="text-xs text-white/40 -tracking-[0.01em]">{label}</div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold text-white/90 -tracking-[0.02em]">
          {value}
          {total && <span className="text-sm font-normal text-white/40"> / {total}</span>}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-all duration-300 ${colorClasses[color]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {detail && (
        <div className="flex justify-end mt-1">
          <span className="text-xs text-white/40 -tracking-[0.01em]">{detail}</span>
        </div>
      )}
    </div>
  );
}
