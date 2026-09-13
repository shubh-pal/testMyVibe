"use client";
import { checkedFetch } from "@/lib/client-fetch";
import LoadError from "@/components/LoadError";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { otherTemplates, type StepDef } from "@/lib/steps";

interface FlowListItem {
  id: string;
  name: string;
  description: string | null;
  source: string;
  _count: { runs: number };
}

export default function FlowsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const [loadError, setLoadError] = useState("");

  const { projectId } = usePromise(params);
  const [flows, setFlows] = useState<FlowListItem[] | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  async function load() {
    try {
      const res = await checkedFetch(`/api/projects/${projectId}`);
      if (res.ok) setFlows((await res.json()).flows);

      setLoadError("");
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Connection failed. Please retry.",
      );
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loadError) return <LoadError message={loadError} />;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Flows</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Auto-discovered by your connected AI, or add one yourself.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowBuilder(true)}>
          + New flow
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {flows === null && <p className="text-neutral-500 text-sm">Loading…</p>}
        {flows?.length === 0 && (
          <p className="text-neutral-500 text-sm">
            No flows yet. Connect the MCP endpoint (Settings) and ask your AI to
            audit this codebase — it will discover flows automatically. Or add
            one manually.
          </p>
        )}
        {flows?.map((f) => (
          <Link
            key={f.id}
            href={`/projects/${projectId}/flows/${f.id}`}
            className="card hover:border-indigo-500/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-medium">{f.name}</h3>
              {f.source === "ai-discovered" && (
                <span className="badge bg-indigo-500/10 text-indigo-300 text-[10px]">
                  AI-discovered
                </span>
              )}
            </div>
            {f.description && (
              <p className="text-sm text-neutral-500 mt-0.5">{f.description}</p>
            )}
            <p className="text-xs text-neutral-600 mt-2">
              {f._count.runs} audit run(s)
            </p>
          </Link>
        ))}
      </div>

      {showBuilder && (
        <FlowBuilderModal
          projectId={projectId}
          onClose={() => setShowBuilder(false)}
          onCreated={() => {
            setShowBuilder(false);
            void Promise.resolve().then(load);
          }}
        />
      )}
    </div>
  );
}

function FlowBuilderModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const templates = otherTemplates();
  const [mode, setMode] = useState<"template" | "custom">("template");
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [name, setName] = useState(templates[0].name);
  const [description, setDescription] = useState(templates[0].description);
  const [steps, setSteps] = useState<StepDef[]>(templates[0].steps);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectTemplate(
    nextMode: "template" | "custom",
    index = selectedTemplate,
  ) {
    setMode(nextMode);
    setSelectedTemplate(index);
    const t = templates[index];
    setName(nextMode === "template" ? t.name : "");
    setDescription(nextMode === "template" ? t.description : "");
    setSteps(
      nextMode === "template"
        ? t.steps
        : [{ order: 0, description: "User visits the home page" }],
    );
  }

  function updateStep(i: number, patch: Partial<StepDef>) {
    setSteps((s) =>
      s.map((step, idx) => (idx === i ? { ...step, ...patch } : step)),
    );
  }

  function addStep() {
    setSteps((s) => [...s, { order: s.length, description: "" }]);
  }

  function removeStep(i: number) {
    setSteps((s) =>
      s
        .filter((_, idx) => idx !== i)
        .map((step, idx) => ({ ...step, order: idx })),
    );
  }

  async function save() {
    setError(null);
    if (
      !name.trim() ||
      steps.length === 0 ||
      steps.some((s) => !s.description.trim())
    ) {
      setError("Give the flow a name and fill in every step's description");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/flows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, steps, source: "manual" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New flow" onClose={onClose} wide>
      <div className="flex flex-col gap-5 max-h-[75vh] overflow-y-auto pr-1">
        <div className="flex gap-2">
          <button
            className={mode === "template" ? "btn-primary" : "btn-secondary"}
            onClick={() => selectTemplate("template")}
          >
            From template
          </button>
          <button
            className={mode === "custom" ? "btn-primary" : "btn-secondary"}
            onClick={() => selectTemplate("custom")}
          >
            Custom
          </button>
        </div>

        {mode === "template" && (
          <div className="flex flex-wrap gap-2">
            {templates.map((t, i) => (
              <button
                key={t.name}
                onClick={() => selectTemplate("template", i)}
                className={`badge border ${
                  i === selectedTemplate
                    ? "border-indigo-400 bg-indigo-500/10 text-indigo-300"
                    : "border-neutral-700 text-neutral-400"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="flow-name"
              className="block text-xs text-neutral-400 mb-1"
            >
              Flow name
            </label>
            <input
              id="flow-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-xs text-neutral-400 mb-1"
            >
              Description
            </label>
            <input
              id="description"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-400">
              Steps (plain English — the AI will verify these against the code)
            </label>
            <button className="btn-secondary text-xs" onClick={addStep}>
              + Add step
            </button>
          </div>
          {steps.map((step, i) => (
            <div
              key={i}
              className="rounded-lg border border-neutral-800 p-3 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 w-5">{i + 1}.</span>
                <input
                  className="input flex-1"
                  placeholder="What the user does, e.g. 'User clicks Login'"
                  value={step.description}
                  onChange={(e) =>
                    updateStep(i, { description: e.target.value })
                  }
                />
                <button
                  className="btn-danger text-xs"
                  onClick={() => removeStep(i)}
                >
                  Remove
                </button>
              </div>
              <input
                className="input ml-7"
                placeholder="Expected outcome (optional), e.g. 'Redirected to /login'"
                value={step.expectedOutcome ?? ""}
                onChange={(e) =>
                  updateStep(i, { expectedOutcome: e.target.value })
                }
              />
            </div>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save flow"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
