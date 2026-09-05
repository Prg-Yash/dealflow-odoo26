export interface StageMetric {
  id: string;
  label: string;
  count: number;
  value: number;
  percentage: number;
  colorClass: string;
}

export interface PipelineStageBarProps {
  stages: StageMetric[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export function PipelineStageBar({
  stages,
  title = "Pipeline Stage Volume & Value",
  subtitle = "Distribution across active deal stages",
  className = "",
}: PipelineStageBarProps) {
  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `₹${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `₹${Math.round(val / 1000)}K`;
    return `₹${val}`;
  };

  return (
    <div className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-sm ${className}`}>
      {/* Header & Stage Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {stages.map((stage) => (
            <div key={stage.id} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${stage.colorClass}`}></span>
              <span className="text-slate-600 font-medium">{stage.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stacked Visual Bar */}
      <div className="mt-5">
        <div className="h-3.5 w-full bg-slate-100 rounded-lg overflow-hidden flex gap-0.5">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className={`${stage.colorClass} h-full transition-all duration-500`}
              style={{ width: `${Math.max(stage.percentage, 4)}%` }}
              title={`${stage.label}: ${formatCurrency(stage.value)} (${stage.count} deals)`}
            />
          ))}
        </div>
      </div>

      {/* Stage Metric Columns */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-100 text-center">
        {stages.map((stage) => (
          <div key={stage.id} className="space-y-0.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {stage.label}
            </div>
            <div className="text-base font-extrabold text-slate-900">
              {formatCurrency(stage.value)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {stage.count} {stage.count === 1 ? "deal" : "deals"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
