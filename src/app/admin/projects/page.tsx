"use client";
import { useEffect, useState } from "react";
import { checkedFetch } from "@/lib/client-fetch";
import LoadError from "@/components/LoadError";

interface AdminProject {
  id: string;
  name: string;
  createdAt: string;
  workspaceName: string;
  flowCount: number;
  mcpEventCount: number;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<AdminProject[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    checkedFetch("/api/admin/projects")
      .then(async (res) => {
        if (!cancelled) setProjects(await res.json());
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Connection failed."),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) return <LoadError message={loadError} />;
  if (!projects) return <p className="text-neutral-500 text-sm">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-neutral-500 text-sm mt-1">
          {projects.length} project{projects.length === 1 ? "" : "s"} across
          every workspace.
        </p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="font-medium px-4 py-3">Project</th>
              <th className="font-medium px-4 py-3">Workspace</th>
              <th className="font-medium px-4 py-3">Flows</th>
              <th className="font-medium px-4 py-3">MCP calls</th>
              <th className="font-medium px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr
                key={p.id}
                className="border-b border-neutral-800 last:border-0"
              >
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-neutral-300">
                  {p.workspaceName}
                </td>
                <td className="px-4 py-3 text-neutral-300">{p.flowCount}</td>
                <td className="px-4 py-3 text-neutral-300">
                  {p.mcpEventCount}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {new Date(p.createdAt).toLocaleDateString(undefined, {
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
