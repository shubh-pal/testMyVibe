"use client";

import { useEffect } from "react";

export default function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className={`card w-full ${wide ? "max-w-3xl" : "max-w-lg"} mt-8 mb-8 bg-neutral-900 border-neutral-700`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-lg">{title}</h2>
          <button className="text-neutral-500 hover:text-neutral-200 text-xl leading-none" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
