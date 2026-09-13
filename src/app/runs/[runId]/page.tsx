"use client";
import { checkedFetch } from "@/lib/client-fetch";
import LoadError from "@/components/LoadError";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";

interface StepResultRow {
  id: string;
  order: number;
  description: string;
  status: string;
  notes: string | null;
}

interface IssueRow {
  id: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  fixPrompt: string;
  filePath: string | null;
  lineStart: number | null;
  stepOrder: number | null;
}

interface RunDetail {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  flow: { id: string; name: string; project: { id: string; name: string } };
  stepResults: StepResultRow[];
  issues: IssueRow[];
}

const severityOrder = ["critical", "high", "medium", "low"];
const severityColor: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-neutral-500/15 text-neutral-400 border-neutral-500/30",
};

const statusColor: Record<string, string> = {
  passed: "bg-emerald-500/10 text-emerald-400",
  failed: "bg-red-500/10 text-red-400",
  running: "bg-amber-500/10 text-amber-400",
  verified: "bg-emerald-500/10 text-emerald-400",
  missing: "bg-red-500/10 text-red-400",
  partial: "bg-amber-500/10 text-amber-400",
};

export default function RunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const [loadError, setLoadError] = useState("");

  const { runId } = usePromise(params);
  const [run, setRun] = useState<RunDetail | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await checkedFetch(`/api/runs/${runId}`);
        if (res.ok && !cancelled) setRun(await res.json());

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
    const interval = setInterval(load, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [runId]);

  async function copyPrompt(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard may be unavailable — no-op
    }
  }

  if (loadError) return <LoadError message={loadError} />;
  if (!run) return <p className="text-neutral-500 text-sm">Loading…</p>;

  const sortedIssues = [...run.issues].sort(
    (a, b) =>
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  );

  const allPromptsText = sortedIssues
    .map(
      (i, idx) =>
        `### ${idx + 1}. [${i.severity.toUpperCase()}] ${i.title}\n\n${i.fixPrompt}`,
    )
    .join("\n\n---\n\n");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/projects/${run.flow.project.id}/flows/${run.flow.id}`}
            className="text-sm text-neutral-500 hover:text-neutral-300"
          >
            ← {run.flow.name}
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-semibold">Audit report</h1>
            <span className={`badge ${statusColor[run.status] ?? ""}`}>
              {run.status}
            </span>
          </div>
          <p className="text-neutral-500 text-sm">
            {new Date(run.startedAt).toLocaleString()}
          </p>
        </div>
        {sortedIssues.length > 0 && (
          <button
            className="btn-secondary"
            onClick={() => copyPrompt("all", allPromptsText)}
          >
            {copiedId === "all" ? "Copied!" : "📋 Copy all fix prompts"}
          </button>
        )}
      </div>

      <div className="card">
        <h2 className="font-medium mb-3">Step-by-step</h2>
        <ol className="flex flex-col gap-2">
          {run.stepResults.map((s) => (
            <li key={s.id} className="flex flex-col gap-0.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-neutral-600 w-5">{s.order + 1}.</span>
                <span
                  className={`badge ${statusColor[s.status] ?? "bg-neutral-800 text-neutral-400"}`}
                >
                  {s.status}
                </span>
                <span className="font-medium">{s.description}</span>
              </div>
              {s.notes && (
                <p className="text-xs text-neutral-500 pl-14">{s.notes}</p>
              )}
            </li>
          ))}
          {run.stepResults.length === 0 && run.status === "running" && (
            <p className="text-neutral-500 text-sm">Audit in progress…</p>
          )}
        </ol>
      </div>

      <div>
        <h2 className="font-medium text-lg mb-3">
          Issues found{" "}
          {sortedIssues.length > 0 && (
            <span className="text-neutral-500">({sortedIssues.length})</span>
          )}
        </h2>
        {sortedIssues.length === 0 && run.status === "passed" && (
          <p className="text-emerald-400 text-sm">
            ✅ No issues found — this flow checks out.
          </p>
        )}
        {sortedIssues.length === 0 && run.status === "running" && (
          <p className="text-neutral-500 text-sm">
            Waiting for the audit to finish…
          </p>
        )}
        <div className="flex flex-col gap-4">
          {sortedIssues.map((issue) => (
            <div
              key={issue.id}
              className={`card border ${severityColor[issue.severity] ?? ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`badge border ${severityColor[issue.severity]}`}
                    >
                      {issue.severity}
                    </span>
                    <span className="badge bg-neutral-800 text-neutral-400">
                      {issue.category}
                    </span>
                    {issue.stepOrder != null && (
                      <span className="text-xs text-neutral-600">
                        step {issue.stepOrder + 1}
                      </span>
                    )}
                    {issue.filePath && (
                      <span className="text-xs text-neutral-500 font-mono">
                        {issue.filePath}
                        {issue.lineStart != null ? `:${issue.lineStart}` : ""}
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium mt-2">{issue.title}</h3>
                  <p className="text-sm text-neutral-400 mt-1">
                    {issue.description}
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-neutral-950 border border-neutral-800 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-neutral-500">
                    Fix prompt (paste into your coding agent)
                  </span>
                  <button
                    className="text-xs text-indigo-400 hover:underline"
                    onClick={() => copyPrompt(issue.id, issue.fixPrompt)}
                  >
                    {copiedId === issue.id ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="text-xs text-neutral-300 whitespace-pre-wrap font-mono">
                  {issue.fixPrompt}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
