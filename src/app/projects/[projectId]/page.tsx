"use client";
import { checkedFetch } from "@/lib/client-fetch";
import LoadError from "@/components/LoadError";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";

interface ProjectInfo {
  id: string;
  name: string;
}

interface Stats {
  flowCount: number;
  runCount: number;
  totalIssues: number;
  issueCounts: Record<string, number>;
  recentRuns: {
    id: string;
    status: string;
    startedAt: string;
    flowName: string;
    issueCount: number;
  }[];
}

const statusColor: Record<string, string> = {
  pending: "bg-neutral-500/15 text-neutral-400",
  approved: "bg-blue-500/15 text-blue-400",
  rejected: "bg-red-500/15 text-red-400",
  in_progress: "bg-amber-500/15 text-amber-400",
  in_review: "bg-purple-500/15 text-purple-400",
  done: "bg-emerald-500/15 text-emerald-400",
  passed: "bg-emerald-500/10 text-emerald-400",
  failed: "bg-red-500/10 text-red-400",
  running: "bg-amber-500/10 text-amber-400",
};

export default function ProjectDashboard({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const [loadError, setLoadError] = useState("");

  const { projectId } = usePromise(params);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [pRes, sRes] = await Promise.all([
          checkedFetch(`/api/projects/${projectId}`),
          checkedFetch(`/api/projects/${projectId}/stats`),
        ]);
        if (cancelled) return;
        if (pRes.ok) setProject(await pRes.json());
        if (sRes.ok) setStats(await sRes.json());

        setLoadError("");
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Connection failed. Please retry.",
        );
      }
    }
    void Promise.resolve().then(load);
    const i = setInterval(load, 6000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [projectId]);

  if (loadError) return <LoadError message={loadError} />;
  if (!project || !stats)
    return <p className="text-neutral-500 text-sm">Loading…</p>;

  const openIssues =
    (stats.issueCounts.pending ?? 0) +
    (stats.issueCounts.approved ?? 0) +
    (stats.issueCounts.in_progress ?? 0) +
    (stats.issueCounts.in_review ?? 0);
  const resolved = stats.issueCounts.done ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="text-neutral-500 text-sm">
          Audit status, user flows, and approved fixes.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Flows" value={stats.flowCount} />
        <StatCard label="Audit runs" value={stats.runCount} />
        <StatCard
          label="Open issues"
          value={openIssues}
          accent="text-amber-400"
        />
        <StatCard label="Resolved" value={resolved} accent="text-emerald-400" />
      </div>

      <div className="grid sm:grid-cols-6 gap-3">
        {[
          "pending",
          "approved",
          "in_progress",
          "in_review",
          "done",
          "rejected",
        ].map((s) => (
          <Link
            key={s}
            href={`/projects/${projectId}/issues`}
            className="card text-center py-4 hover:border-indigo-500/50"
          >
            <p className="text-2xl font-semibold">
              {stats.issueCounts[s] ?? 0}
            </p>
            <p className={`badge mt-2 ${statusColor[s]}`}>
              {s.replace("_", " ")}
            </p>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="font-medium text-lg mb-3">Recent audit runs</h2>
        {stats.recentRuns.length === 0 && (
          <p className="text-neutral-500 text-sm">No runs yet.</p>
        )}
        <div className="flex flex-col gap-2">
          {stats.recentRuns.map((r) => (
            <Link
              key={r.id}
              href={`/runs/${r.id}`}
              className="card flex items-center justify-between hover:border-indigo-500/50"
            >
              <div className="flex items-center gap-3">
                <span className={`badge ${statusColor[r.status]}`}>
                  {r.status}
                </span>
                <span className="text-sm">{r.flowName}</span>
              </div>
              <span className="text-xs text-neutral-500">
                {r.issueCount} issue(s)
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="card">
      <p className={`text-3xl font-semibold ${accent ?? ""}`}>{value}</p>
      <p className="text-sm text-neutral-500 mt-1">{label}</p>
    </div>
  );
}
