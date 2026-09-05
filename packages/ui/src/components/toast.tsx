"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { cn } from "../lib/cn";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  id?: number;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface InternalToast {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

export interface ToastFn {
  (message: string, variant?: ToastVariant): void;
  error: (title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

interface ToastContextValue {
  toast: ToastFn;
}

const ToastContext = createContext<ToastContextValue>({
  toast: Object.assign(() => {}, {
    error: () => {},
    success: () => {},
    warning: () => {},
    info: () => {},
  }),
});

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<InternalToast[]>([]);

  const addToast = useCallback(
    (
      titleOrMessage: string,
      variantOrDesc?: ToastVariant | string,
      maybeDesc?: string
    ) => {
      const id = ++toastId;
      let variant: ToastVariant = "info";
      let title = titleOrMessage;
      let description: string | undefined;

      if (
        variantOrDesc === "success" ||
        variantOrDesc === "error" ||
        variantOrDesc === "warning" ||
        variantOrDesc === "info"
      ) {
        variant = variantOrDesc;
        description = maybeDesc;
      } else if (typeof variantOrDesc === "string") {
        description = variantOrDesc;
      }

      setToasts((prev) => [
        ...prev,
        { id, title, description, variant, duration: 4500 },
      ]);
    },
    []
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastFn: ToastFn = useMemo(() => {
    const fn = (message: string, variant?: ToastVariant) => {
      addToast(message, variant);
    };

    fn.error = (title: string, description?: string) => {
      addToast(title, "error", description);
    };

    fn.success = (title: string, description?: string) => {
      addToast(title, "success", description);
    };

    fn.warning = (title: string, description?: string) => {
      addToast(title, "warning", description);
    };

    fn.info = (title: string, description?: string) => {
      addToast(title, "info", description);
    };

    return fn;
  }, [addToast]);

  const contextValue = useMemo(() => ({ toast: toastFn }), [toastFn]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Overlay Container: Fixed Top-Right for Maximum Visibility */}
      <div
        className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full px-4 pointer-events-none"
        aria-live="assertive"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const variantConfig: Record<
  ToastVariant,
  {
    icon: typeof AlertCircle;
    border: string;
    bg: string;
    iconBg: string;
    iconColor: string;
    titleColor: string;
    descColor: string;
  }
> = {
  error: {
    icon: AlertCircle,
    border: "border-red-200 shadow-lg shadow-red-500/10",
    bg: "bg-white",
    iconBg: "bg-red-50 border border-red-200 text-red-600",
    iconColor: "text-red-600",
    titleColor: "text-red-900",
    descColor: "text-red-700",
  },
  success: {
    icon: CheckCircle2,
    border: "border-emerald-200 shadow-lg shadow-emerald-500/10",
    bg: "bg-white",
    iconBg: "bg-emerald-50 border border-emerald-200 text-emerald-600",
    iconColor: "text-emerald-600",
    titleColor: "text-emerald-950",
    descColor: "text-emerald-800",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-200 shadow-lg shadow-amber-500/10",
    bg: "bg-white",
    iconBg: "bg-amber-50 border border-amber-200 text-amber-600",
    iconColor: "text-amber-600",
    titleColor: "text-amber-950",
    descColor: "text-amber-800",
  },
  info: {
    icon: Info,
    border: "border-blue-200 shadow-lg shadow-blue-500/10",
    bg: "bg-white",
    iconBg: "bg-blue-50 border border-blue-200 text-blue-600",
    iconColor: "text-blue-600",
    titleColor: "text-blue-950",
    descColor: "text-blue-800",
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: InternalToast;
  onDismiss: () => void;
}) {
  const cfg = variantConfig[toast.variant] || variantConfig.info;
  const IconComponent = cfg.icon;

  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration || 4500);
    return () => clearTimeout(timer);
  }, [onDismiss, toast.duration]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl transition-all duration-300 transform translate-y-0",
        cfg.bg,
        cfg.border
      )}
      role="alert"
    >
      <div
        className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
          cfg.iconBg
        )}
      >
        <IconComponent size={18} className={cfg.iconColor} />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <h4 className={cn("text-xs font-bold leading-tight", cfg.titleColor)}>
          {toast.title}
        </h4>
        {toast.description && (
          <p className={cn("text-[11px] font-medium mt-1 leading-snug", cfg.descColor)}>
            {toast.description}
          </p>
        )}
      </div>

      <button
        onClick={onDismiss}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
