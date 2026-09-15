"use client";
import { useEffect, useState } from "react";
import { checkedFetch } from "@/lib/client-fetch";
import LoadError from "@/components/LoadError";

interface Stats {
  users: {
    total: number;
    new7d: number;
    new30d: number;
    signupsByDay: { date: string; count: number }[];
  };
  workspaces: { total: number };
  projects: {
    total: number;
    topByMcpActivity: {
      id: string;
      name: string;
      workspace: { name: string };
      createdAt: string;
      _count: { flows: number; mcpEvents: number };
    }[];
  };
  flows: { bySource: Record<string, number> };
  runs: { byStatus: Record<string, number> };
  issues: {
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
  };
  mcp: {
    total: number;
    last7d: number;
    byTool: Record<string, number>;
    callsByDay: { date: string; count: number }[];
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    checkedFetch("/api/admin/stats")
      .then(async (res) => {
        if (!cancelled) setStats(await res.json());
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Connection failed."),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) return <LoadError message={loadError} />;
  if (!stats) return <p className="text-neutral-500 text-sm">Loading… (querying every workspace — can take a few seconds)</p>;

  const totalRuns = Object.values(stats.runs.byStatus).reduce(
    (a, b) => a + b,
    0,
  );
  const totalIssues = Object.values(stats.issues.byStatus).reduce(
    (a, b) => a + b,
    0,
  );
  const totalFlows = Object.values(stats.flows.bySource).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-neutral-500 text-sm mt-1">
          How people are onboarding and what they're actually doing with a
          connected AI tool.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Signups" value={stats.users.total} />
        <StatCard
          label="Workspaces"
          value={stats.workspaces.total}
        />
        <StatCard label="Projects" value={stats.projects.total} />
        <StatCard
          label="MCP tool calls"
          value={stats.mcp.total}
          accent="text-indigo-400"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-medium mb-1">Signups, last 14 days</h2>
          <p className="text-xs text-neutral-500 mb-4">
            {stats.users.new7d} in the last 7 days · {stats.users.new30d} in
            the last 30
          </p>
          <DayBars data={stats.users.signupsByDay} />
        </div>
        <div className="card">
          <h2 className="font-medium mb-1">MCP tool calls, last 14 days</h2>
          <p className="text-xs text-neutral-500 mb-4">
            {stats.mcp.last7d} in the last 7 days — this is the real signal
            for whether people are actually using their AI tool against
            TestMyVibe, not just signing up.
          </p>
          <DayBars data={stats.mcp.callsByDay} accent="bg-indigo-500" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-medium mb-3">MCP tools called</h2>
          {Object.keys(stats.mcp.byTool).length === 0 ? (
            <p className="text-neutral-500 text-sm">
              No MCP activity yet — no one has connected an AI tool and run a
              tool call.
            </p>
          ) : (
            <BreakdownBars counts={stats.mcp.byTool} />
          )}
        </div>
        <div className="card">
          <h2 className="font-medium mb-3">
            Flows discovered ({totalFlows} total)
          </h2>
          {totalFlows === 0 ? (
            <p className="text-neutral-500 text-sm">
              No flows yet — no project has run discovery.
            </p>
          ) : (
            <BreakdownBars counts={stats.flows.bySource} />
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <h2 className="font-medium mb-3">
            Audit runs ({totalRuns} total)
          </h2>
          {totalRuns === 0 ? (
            <p className="text-neutral-500 text-sm">No runs yet.</p>
          ) : (
            <BreakdownBars counts={stats.runs.byStatus} />
          )}
        </div>
        <div className="card">
          <h2 className="font-medium mb-3">
            Issues by status ({totalIssues} total)
          </h2>
          {totalIssues === 0 ? (
            <p className="text-neutral-500 text-sm">No issues yet.</p>
          ) : (
            <BreakdownBars counts={stats.issues.byStatus} />
          )}
        </div>
        <div className="card">
          <h2 className="font-medium mb-3">Issues by severity</h2>
          {totalIssues === 0 ? (
            <p className="text-neutral-500 text-sm">No issues yet.</p>
          ) : (
            <BreakdownBars counts={stats.issues.bySeverity} />
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-medium mb-3">
          Most active projects (by MCP tool calls)
        </h2>
        {stats.projects.topByMcpActivity.length === 0 ? (
          <p className="text-neutral-500 text-sm">
            No projects have connected an AI tool yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {stats.projects.topByMcpActivity.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm border-b border-neutral-800 pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-neutral-500 text-xs">
                    {p.workspace.name} · {p._count.flows} flow
                    {p._count.flows === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="badge bg-indigo-500/15 text-indigo-400 shrink-0">
                  {p._count.mcpEvents} calls
                </span>
              </div>
            ))}
          </div>
        )}
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

function BreakdownBars({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, n]) => n), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {entries.map(([key, n]) => (
        <div key={key} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 truncate text-neutral-400">
            {key.replace(/_/g, " ")}
          </span>
          <div className="flex-1 h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-neutral-500 rounded-full"
              style={{ width: `${(n / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right shrink-0 text-neutral-300">
            {n}
          </span>
        </div>
      ))}
    </div>
  );
}

function DayBars({
  data,
  accent = "bg-neutral-500",
}: {
  data: { date: string; count: number }[];
  accent?: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d) => (
        <div
          key={d.date}
          className="flex-1 flex flex-col items-center justify-end gap-1 group relative"
        >
          <div
            className={`w-full rounded-t ${accent} min-h-[2px]`}
            style={{ height: `${Math.max((d.count / max) * 100, 2)}%` }}
            title={`${d.date}: ${d.count}`}
          />
          <span className="text-[9px] text-neutral-600">
            {d.date.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}
