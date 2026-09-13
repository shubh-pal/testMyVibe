"use client";
import { checkedFetch } from "@/lib/client-fetch";
import LoadError from "@/components/LoadError";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";

interface ProjectListItem {
  id: string;
  name: string;
  createdAt: string;
  flows: { id: string }[];
}

export default function ProjectsPage() {
  const [loadError, setLoadError] = useState("");

  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectListItem | null>(null);

  async function load() {
    try {
      const res = await checkedFetch("/api/projects");
      setProjects(await res.json());

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
  }, []);

  async function remove(p: ProjectListItem) {
    if (
      !confirm(
        `Delete "${p.name}"? This removes all its flows, runs, and issues.`,
      )
    )
      return;
    await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
    void Promise.resolve().then(load);
  }

  if (loadError) return <LoadError message={loadError} />;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Codebases you are auditing with TestMyVibe.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          + New project
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {projects === null && (
          <p className="text-neutral-500 text-sm">Loading…</p>
        )}
        {projects?.length === 0 && (
          <p className="text-neutral-500 text-sm">
            No projects yet — create one above.
          </p>
        )}
        {projects?.map((p) => (
          <div
            key={p.id}
            className="card flex items-start justify-between gap-3"
          >
            <Link
              href={`/projects/${p.id}`}
              className="min-w-0 flex-1 hover:opacity-80"
            >
              <h2 className="font-medium truncate">{p.name}</h2>
              <p className="text-sm text-neutral-500 mt-1">
                {p.flows.length} user flow{p.flows.length === 1 ? "" : "s"}
              </p>
            </Link>
            <div className="flex flex-col gap-2 shrink-0">
              <button
                className="btn-secondary text-xs"
                onClick={() => setEditing(p)}
              >
                Edit
              </button>
              <button className="btn-danger text-xs" onClick={() => remove(p)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {creating && (
        <ProjectFormModal
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            setCreating(false);
            router.push(`/projects/${id}`);
          }}
        />
      )}

      {editing && (
        <ProjectFormModal
          project={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void Promise.resolve().then(load);
          }}
        />
      )}
    </div>
  );
}

function ProjectFormModal({
  project,
  onClose,
  onSaved,
}: {
  project?: ProjectListItem;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!name.trim()) {
      setError("Give the project a name");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        project ? `/api/projects/${project.id}` : "/api/projects",
        {
          method: project ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      onSaved(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={project ? "Edit project" : "New project"} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div>
          <label
            htmlFor="project-name"
            className="block text-xs text-neutral-400 mb-1"
          >
            Project name
          </label>
          <input
            id="project-name"
            className="input"
            placeholder="My SaaS"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <p className="text-sm text-neutral-400 leading-6">
          Your connected AI tool audits the repository already open in its
          workspace. TestMyVibe only stores the project name and audit record.
        </p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex justify-end gap-2 mt-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
