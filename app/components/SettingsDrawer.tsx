"use client";
import { useEffect, useRef, type ReactNode } from "react";

export default function SettingsDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="settings-drawer"
      aria-labelledby="settings-title"
      onClose={onClose}
      onCancel={onClose}
    >
      <header className="settings-drawer-header">
        <h2 id="settings-title" className="text-xl font-bold">
          Settings & support
        </h2>
        <button className="action" onClick={onClose}>
          Close
        </button>
      </header>
      {open && <div className="space-y-5 p-4 sm:p-6">{children}</div>}
    </dialog>
  );
}
