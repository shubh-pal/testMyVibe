"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";

interface StepRow {
  id: string;
  order: number;
  description: string;
  expectedOutcome: string | null;
}

interface RunRow {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  summary: string | null;
}

interface FlowDetail {
  id: string;
  name: string;
  description: string | null;
  source: string;
  steps: StepRow[];
  runs: RunRow[];
  project: { id: string; name: string };
}

const statusColor: Record<string, string> = {
  passed: "bg-emerald-500/10 text-emerald-400",
  failed: "bg-red-500/10 text-red-400",
  running: "bg-amber-500/10 text-amber-400",
};

export default function FlowPage({ params }: { params: Promise<{ projectId: string; flowId: string }> }) {
  const { projectId, flowId } = usePromise(params);
  const [flow, setFlow] = useState<FlowDetail | null>(null);

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/flows/${flowId}`);
    if (res.ok) setFlow(await res.json());
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId]);

  if (!flow) return <p className="text-neutral-500 text-sm">Loading…</p>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/projects/${projectId}`} className="text-sm text-neutral-500 hover:text-neutral-300">
          ← {flow.project.name}
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <h1 className="text-2xl font-semibold">{flow.name}</h1>
          {flow.source === "ai-discovered" && (
            <span className="badge bg-indigo-500/10 text-indigo-300 text-[10px]">AI-discovered</span>
          )}
        </div>
        {flow.description && <p className="text-neutral-500 text-sm">{flow.description}</p>}
      </div>

      <div className="card">
        <h2 className="font-medium mb-3">Steps</h2>
        <ol className="flex flex-col gap-2">
          {flow.steps.map((s) => (
            <li key={s.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className="text-neutral-600 w-5">{s.order + 1}.</span>
                <span className="font-medium">{s.description}</span>
              </div>
              {s.expectedOutcome && <p className="text-xs text-neutral-500 pl-7 mt-0.5">→ {s.expectedOutcome}</p>}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-lg">Audit runs</h2>
          <p className="text-xs text-neutral-600">
            Runs are created by your connected AI via MCP — ask it to audit this flow.
          </p>
        </div>
        {flow.runs.length === 0 && <p className="text-neutral-500 text-sm">No audit runs yet.</p>}
        <div className="flex flex-col gap-2">
          {flow.runs.map((r) => {
            const summary = r.summary ? JSON.parse(r.summary) : null;
            return (
              <Link
                key={r.id}
                href={`/runs/${r.id}`}
                className="card flex items-center justify-between hover:border-indigo-500/50"
              >
                <div className="flex items-center gap-3">
                  <span className={`badge ${statusColor[r.status] ?? ""}`}>{r.status}</span>
                  <span className="text-sm text-neutral-400">{new Date(r.startedAt).toLocaleString()}</span>
                </div>
                {summary && (
                  <span className="text-xs text-neutral-500">
                    {summary.verifiedSteps ?? 0}/{summary.totalSteps ?? "?"} steps verified · {summary.issueCount ?? 0} issue(s)
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
