"use client";
import { useEffect, useState } from "react";
import { checkedFetch } from "@/lib/client-fetch";
import LoadError from "@/components/LoadError";

interface AdminWorkspace {
  id: string;
  name: string;
  createdAt: string;
  userCount: number;
  projectCount: number;
  ownerEmail: string | null;
}

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    checkedFetch("/api/admin/workspaces")
      .then(async (res) => {
        if (!cancelled) setWorkspaces(await res.json());
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Connection failed."),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) return <LoadError message={loadError} />;
  if (!workspaces) return <p className="text-neutral-500 text-sm">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Workspaces</h1>
        <p className="text-neutral-500 text-sm mt-1">
          {workspaces.length} workspace{workspaces.length === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="font-medium px-4 py-3">Workspace</th>
              <th className="font-medium px-4 py-3">Owner email</th>
              <th className="font-medium px-4 py-3">Members</th>
              <th className="font-medium px-4 py-3">Projects</th>
              <th className="font-medium px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((w) => (
              <tr
                key={w.id}
                className="border-b border-neutral-800 last:border-0"
              >
                <td className="px-4 py-3 font-medium">{w.name}</td>
                <td className="px-4 py-3 text-neutral-300">
                  {w.ownerEmail ?? "—"}
                </td>
                <td className="px-4 py-3 text-neutral-300">{w.userCount}</td>
                <td className="px-4 py-3 text-neutral-300">
                  {w.projectCount}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {new Date(w.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
