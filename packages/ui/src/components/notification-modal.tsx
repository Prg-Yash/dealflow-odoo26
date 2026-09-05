"use client";

import { useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, FileText, Check, Bell, ArrowRight } from "lucide-react";
import { cn } from "../lib/cn";
import { Modal } from "./modal";
import { Button } from "./button";

export interface DealNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "approval" | "escalation" | "confirmed" | "info";
  quoteId?: string;
  customer?: string;
  read: boolean;
}

const DEFAULT_NOTIFICATIONS: DealNotification[] = [
  {
    id: "notif-1",
    title: "Quotation Q-1042 Approved",
    message: "Marcus Vance (Sales Director) approved Acme Corporation proposal (₹68,500) for customer delivery.",
    timestamp: "10m ago",
    type: "approval",
    quoteId: "Q-1042",
    customer: "Acme Corporation",
    read: false,
  },
  {
    id: "notif-2",
    title: "Tier 2 Approval Requested",
    message: "OmniRetail Global requested 15% discount on cluster license (₹114,200). Awaiting FinOps sign-off.",
    timestamp: "45m ago",
    type: "escalation",
    quoteId: "Q-1044",
    customer: "OmniRetail Global",
    read: false,
  },
  {
    id: "notif-3",
    title: "Contract Signed & PO Issued",
    message: "Northstar Labs executed quotation Q-1046 (₹96,500). Ready for fulfillment handoff.",
    timestamp: "2h ago",
    type: "confirmed",
    quoteId: "Q-1046",
    customer: "Northstar Labs",
    read: false,
  },
  {
    id: "notif-4",
    title: "Commercial Verification Complete",
    message: "Elena Rostova verified custom SSO & SLA commercial line items on Strata Logistics (Q-1045).",
    timestamp: "5h ago",
    type: "info",
    quoteId: "Q-1045",
    customer: "Strata Logistics",
    read: true,
  },
];

interface NotificationModalProps {
  open: boolean;
  onClose: () => void;
  onNavigateToQuote?: (quoteId: string) => void;
}

export function NotificationModal({ open, onClose, onNavigateToQuote }: NotificationModalProps) {
  const [notifications, setNotifications] = useState<DealNotification[]>(DEFAULT_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markSingleAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleItemClick = (quoteId?: string) => {
    if (quoteId && onNavigateToQuote) {
      onNavigateToQuote(quoteId);
      onClose();
    }
  };

  const filtered = notifications.filter((n) => (filter === "all" ? true : !n.read));

  const getTypeIcon = (type: DealNotification["type"]) => {
    switch (type) {
      case "approval":
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case "escalation":
        return <AlertTriangle size={16} className="text-amber-500" />;
      case "confirmed":
        return <Check size={16} className="text-[#ff5e3a]" />;
      default:
        return <FileText size={16} className="text-sky-500" />;
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Deal Notifications" className="max-w-lg">
      <div className="space-y-4">
        {/* Header toolbar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">
              {unreadCount > 0 ? `${unreadCount} Unread Updates` : "All caught up"}
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-orange-50 text-[#ff5e3a] font-bold text-[10px] border border-orange-200">
                Live
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors",
                filter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors",
                filter === "unread" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Unread ({unreadCount})
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-slate-500 hover:text-[#ff5e3a] text-xs font-medium underline pl-1 cursor-pointer transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
              <Bell size={24} className="mb-2 text-slate-300" />
              <span>No {filter === "unread" ? "unread " : ""}notifications at this time.</span>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item.quoteId)}
                className={cn(
                  "pt-3 first:pt-0 p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3",
                  item.read ? "hover:bg-slate-50 opacity-80" : "bg-orange-50/40 hover:bg-orange-50/80 border border-orange-100/80"
                )}
              >
                <div className="mt-0.5 shrink-0">{getTypeIcon(item.type)}</div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-xs font-bold leading-tight", item.read ? "text-slate-800" : "text-slate-900")}>
                      {item.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 flex items-center gap-1">
                      <Clock size={10} />
                      {item.timestamp}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">{item.message}</p>

                  <div className="flex items-center justify-between pt-1">
                    {item.quoteId && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ff5e3a] hover:underline">
                        <span>Inspect {item.quoteId}</span>
                        <ArrowRight size={10} />
                      </span>
                    )}

                    {!item.read && (
                      <button
                        type="button"
                        onClick={(e) => markSingleAsRead(item.id, e)}
                        className="text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer font-medium ml-auto"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} className="text-xs h-8 px-4 border-slate-200">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
