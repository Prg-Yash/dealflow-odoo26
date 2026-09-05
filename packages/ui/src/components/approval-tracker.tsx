import { Check, Clock } from "lucide-react";

export interface ApprovalStepItem {
  id: string;
  label: string;
  role: string;
  status: "completed" | "active" | "pending" | "rejected";
  assignedTo?: string;
  timestamp?: string;
}

export interface ApprovalTrackerProps {
  steps: ApprovalStepItem[];
  className?: string;
}

export function ApprovalTracker({ steps, className = "" }: ApprovalTrackerProps) {
  return (
    <div className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-sm ${className}`}>
      <h3 className="text-sm font-bold text-slate-900 mb-5">Approval Workflow</h3>
      
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Connector Line on desktop */}
        <div className="hidden md:block absolute top-5 left-8 right-8 h-0.5 bg-slate-200 -z-0" />

        {steps.map((step, idx) => {
          const isCompleted = step.status === "completed";
          const isActive = step.status === "active";

          return (
            <div key={step.id} className="relative z-10 flex md:flex-col items-center md:text-center gap-3 md:gap-2">
              {/* Step Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                  isCompleted
                    ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                    : isActive
                    ? "bg-[#ff5e3a] text-white ring-4 ring-orange-100 shadow-sm shadow-[#ff5e3a]/25"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                {isCompleted ? (
                  <Check size={16} strokeWidth={2.5} />
                ) : isActive ? (
                  <Clock size={16} className="animate-pulse" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Step Info */}
              <div className="flex flex-col md:items-center">
                <span
                  className={`text-xs font-bold leading-tight ${
                    isActive ? "text-[#ff5e3a]" : isCompleted ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {step.role} {step.assignedTo ? `(${step.assignedTo})` : ""}
                </span>
                {step.timestamp && (
                  <span className="text-[10px] text-slate-400 mt-0.5">{step.timestamp}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
