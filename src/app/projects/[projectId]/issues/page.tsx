"use client";

import { useEffect, useState, useCallback, use as usePromise } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Modal from "@/components/Modal";

interface IssueCard {
  id: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  status: string;
  filePath: string | null;
  lineStart: number | null;
  createdAt: string;
  updatedAt: string;
  flowId: string;
  flowName: string;
  runId: string;
}

const COLUMNS: { key: string; label: string }[] = [
  { key: "pending", label: "Pending review" },
  { key: "approved", label: "Approved" },
  { key: "in_progress", label: "In progress" },
  { key: "in_review", label: "In review" },
  { key: "done", label: "Done" },
  { key: "rejected", label: "Rejected" },
];

const severityColor: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-neutral-500/15 text-neutral-400 border-neutral-500/30",
};

export default function IssuesBoard({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = usePromise(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [issues, setIssues] = useState<IssueCard[] | null>(null);
  const [openIssueId, setOpenIssueId] = useState<string | null>(searchParams.get("issue"));
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/issues`);
    if (res.ok) setIssues(await res.json());
  }, [projectId]);

  useEffect(() => {
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [load]);

  async function setStatus(issueId: string, status: string) {
    setIssues((prev) => prev?.map((i) => (i.id === issueId ? { ...i, status } : i)) ?? prev);
    await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  function closeModal() {
    setOpenIssueId(null);
    router.replace(`/projects/${projectId}/issues`);
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <h1 className="text-2xl font-semibold">Issues</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Approve or reject what your AI finds. Once approved, ask it to "work through approved issues" —
          it claims the queue via MCP and moves fixes to review automatically.
        </p>
      </div>

      {issues === null && <p className="text-neutral-500 text-sm">Loading…</p>}

      {issues && (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-8 px-8">
          {COLUMNS.map((col) => {
            const colIssues = issues.filter((i) => i.status === col.key);
            return (
              <div
                key={col.key}
                className={`w-72 shrink-0 rounded-xl border ${
                  dragOverCol === col.key ? "border-indigo-400 bg-indigo-500/5" : "border-neutral-800 bg-neutral-900/40"
                } flex flex-col`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(col.key);
                }}
                onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverCol(null);
                  const issueId = e.dataTransfer.getData("text/issue-id");
                  if (issueId) setStatus(issueId, col.key);
                }}
              >
                <div className="px-3 py-3 border-b border-neutral-800 flex items-center justify-between">
                  <span className="text-sm font-medium">{col.label}</span>
                  <span className="text-xs text-neutral-500">{colIssues.length}</span>
                </div>
                <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1">
                  {colIssues.map((issue) => (
                    <div
                      key={issue.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/issue-id", issue.id)}
                      onClick={() => setOpenIssueId(issue.id)}
                      className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 cursor-pointer hover:border-indigo-500/50 flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`badge border text-[10px] ${severityColor[issue.severity]}`}>{issue.severity}</span>
                        <span className="badge bg-neutral-800 text-neutral-400 text-[10px]">{issue.category}</span>
                      </div>
                      <p className="text-sm font-medium leading-snug">{issue.title}</p>
                      <p className="text-xs text-neutral-600">{issue.flowName}</p>
                      {col.key === "pending" && (
                        <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn-primary text-xs flex-1 justify-center py-1"
                            onClick={() => setStatus(issue.id, "approved")}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-danger text-xs flex-1 justify-center py-1"
                            onClick={() => setStatus(issue.id, "rejected")}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {col.key === "in_review" && (
                        <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn-primary text-xs flex-1 justify-center py-1"
                            onClick={() => setStatus(issue.id, "done")}
                          >
                            Mark done
                          </button>
                          <button
                            className="btn-secondary text-xs flex-1 justify-center py-1"
                            onClick={() => setStatus(issue.id, "approved")}
                          >
                            Send back
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {colIssues.length === 0 && <p className="text-xs text-neutral-700 text-center py-4">Empty</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openIssueId && <IssueDetailModal issueId={openIssueId} onClose={closeModal} onChanged={load} />}
    </div>
  );
}

interface IssueDetail extends IssueCard {
  fixPrompt: string;
  stepOrder: number | null;
  resolutionNotes: string | null;
  reviewNotes: string | null;
  run: {
    id: string;
    status: string;
    startedAt: string;
    flow: { id: string; name: string; project: { id: string; name: string } };
    stepResults: { order: number; description: string; status: string; notes: string | null }[];
  };
}

function IssueDetailModal({
  issueId,
  onClose,
  onChanged,
}: {
  issueId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/issues/${issueId}`);
    if (res.ok) setIssue(await res.json());
  }, [issueId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(status: string) {
    await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    onChanged();
  }

  async function copy() {
    if (!issue) return;
    try {
      await navigator.clipboard.writeText(issue.fixPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <Modal title="Issue details" onClose={onClose} wide>
      {!issue ? (
        <p className="text-neutral-500 text-sm">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge border ${severityColor[issue.severity]}`}>{issue.severity}</span>
            <span className="badge bg-neutral-800 text-neutral-400">{issue.category}</span>
            <span className="badge bg-neutral-800 text-neutral-300">{issue.status.replace("_", " ")}</span>
          </div>

          <h3 className="text-lg font-medium">{issue.title}</h3>
          <p className="text-sm text-neutral-400">{issue.description}</p>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-neutral-500">Flow</p>
              <p>{issue.run.flow.name}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Audit run</p>
              <a href={`/runs/${issue.run.id}`} className="text-indigo-400 hover:underline">
                {new Date(issue.run.startedAt).toLocaleString()}
              </a>
            </div>
            {issue.filePath && (
              <div>
                <p className="text-xs text-neutral-500">File</p>
                <p className="font-mono text-xs">
                  {issue.filePath}
                  {issue.lineStart != null ? `:${issue.lineStart}` : ""}
                </p>
              </div>
            )}
            {issue.stepOrder != null && (
              <div>
                <p className="text-xs text-neutral-500">Step</p>
                <p>
                  #{issue.stepOrder + 1} —{" "}
                  {issue.run.stepResults.find((s) => s.order === issue.stepOrder)?.description ?? ""}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-neutral-950 border border-neutral-800 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-neutral-500">Fix prompt (paste into Claude Code)</span>
              <button className="text-xs text-indigo-400 hover:underline" onClick={copy}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="text-xs text-neutral-300 whitespace-pre-wrap font-mono">{issue.fixPrompt}</pre>
          </div>

          {issue.resolutionNotes && (
            <div className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-3">
              <p className="text-xs text-purple-300 mb-1">What the AI changed</p>
              <p className="text-sm text-neutral-300 whitespace-pre-wrap">{issue.resolutionNotes}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-800">
            {issue.status === "pending" && (
              <>
                <button className="btn-primary" onClick={() => setStatus("approved")}>
                  Approve
                </button>
                <button className="btn-danger" onClick={() => setStatus("rejected")}>
                  Reject
                </button>
              </>
            )}
            {issue.status === "approved" && (
              <button className="btn-secondary" onClick={() => setStatus("pending")}>
                Move back to pending
              </button>
            )}
            {issue.status === "in_review" && (
              <>
                <button className="btn-primary" onClick={() => setStatus("done")}>
                  Mark done
                </button>
                <button className="btn-secondary" onClick={() => setStatus("approved")}>
                  Send back to queue
                </button>
              </>
            )}
            {issue.status === "rejected" && (
              <button className="btn-secondary" onClick={() => setStatus("pending")}>
                Reopen
              </button>
            )}
            {issue.status === "done" && (
              <button className="btn-secondary" onClick={() => setStatus("in_review")}>
                Reopen for review
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
