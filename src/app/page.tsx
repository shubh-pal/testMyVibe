"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  projectCount: number;
  flowCount: number;
  runCount: number;
  issueCounts: Record<string, number>;
  recentIssues: {
    id: string;
    title: string;
    severity: string;
    status: string;
    createdAt: string;
    projectId: string;
    projectName: string;
    flowName: string;
  }[];
}

const severityColor: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400",
  high: "bg-orange-500/15 text-orange-400",
  medium: "bg-amber-500/15 text-amber-400",
  low: "bg-neutral-500/15 text-neutral-400",
};

const statusColor: Record<string, string> = {
  pending: "bg-neutral-500/15 text-neutral-400",
  approved: "bg-blue-500/15 text-blue-400",
  rejected: "bg-red-500/15 text-red-400",
  in_progress: "bg-amber-500/15 text-amber-400",
  in_review: "bg-purple-500/15 text-purple-400",
  done: "bg-emerald-500/15 text-emerald-400",
};

export default function OrgDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/stats");
      if (res.ok && !cancelled) setStats(await res.json());
    }
    load();
    const i = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  if (!stats) return <p className="text-neutral-500 text-sm">Loading…</p>;

  const openIssues =
    (stats.issueCounts.pending ?? 0) +
    (stats.issueCounts.approved ?? 0) +
    (stats.issueCounts.in_progress ?? 0) +
    (stats.issueCounts.in_review ?? 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Org dashboard</h1>
          <p className="text-neutral-500 text-sm mt-1">Everything across all your connected projects.</p>
        </div>
        <Link href="/projects" className="btn-primary">
          Manage projects
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Projects" value={stats.projectCount} />
        <StatCard label="Flows" value={stats.flowCount} />
        <StatCard label="Audit runs" value={stats.runCount} />
        <StatCard label="Open issues" value={openIssues} accent="text-amber-400" />
      </div>

      <div className="grid sm:grid-cols-6 gap-3">
        {["pending", "approved", "in_progress", "in_review", "done", "rejected"].map((s) => (
          <div key={s} className="card text-center py-4">
            <p className="text-2xl font-semibold">{stats.issueCounts[s] ?? 0}</p>
            <p className={`badge mt-2 ${statusColor[s]}`}>{s.replace("_", " ")}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-medium text-lg mb-3">Recent issues</h2>
        {stats.recentIssues.length === 0 && <p className="text-neutral-500 text-sm">No issues reported yet.</p>}
        <div className="flex flex-col gap-2">
          {stats.recentIssues.map((issue) => (
            <Link
              key={issue.id}
              href={`/projects/${issue.projectId}/issues?issue=${issue.id}`}
              className="card flex items-center justify-between hover:border-indigo-500/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`badge ${severityColor[issue.severity]}`}>{issue.severity}</span>
                <span className="font-medium truncate">{issue.title}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs text-neutral-500">
                <span>
                  {issue.projectName} · {issue.flowName}
                </span>
                <span className={`badge ${statusColor[issue.status]}`}>{issue.status.replace("_", " ")}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="card">
      <p className={`text-3xl font-semibold ${accent ?? ""}`}>{value}</p>
      <p className="text-sm text-neutral-500 mt-1">{label}</p>
    </div>
  );
}
