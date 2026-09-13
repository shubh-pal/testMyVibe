"use client";
import { useEffect, useRef, useId } from "react";
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
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={
        "app-dialog card text-neutral-100 " + (wide ? "max-w-3xl" : "max-w-lg")
      }
    >
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 id={titleId} className="font-medium text-lg">
            {title}
          </h2>
          <button
            aria-label="Close dialog"
            className="text-neutral-400 text-xl p-1"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
