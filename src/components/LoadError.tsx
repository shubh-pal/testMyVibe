"use client";
import Link from "next/link";
export default function LoadError({ message }: { message: string }) {
  return (
    <div className="card flex flex-col gap-4" role="alert">
      <h2 className="font-semibold">Unable to load this view</h2>
      <p className="text-neutral-400">{message}</p>
      <div className="flex gap-3">
        <button
          className="btn-primary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
        <Link href="/dashboard" className="btn-secondary">
          Workspace
        </Link>
        <Link href="/login" className="btn-secondary">
          Sign in
        </Link>
      </div>
    </div>
  );
}
