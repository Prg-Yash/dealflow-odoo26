"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className={cn(
        "rounded-[2rem] border border-outline-variant/50 bg-surface-container-lowest p-0 shadow-glass backdrop:bg-inverse-surface/40 backdrop:backdrop-blur-sm",
        "max-w-lg w-full",
        className,
      )}
    >
      <div className="flex flex-col">
        {title && (
          <div className="flex items-center justify-between border-b border-outline-variant/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </dialog>
  );
}
