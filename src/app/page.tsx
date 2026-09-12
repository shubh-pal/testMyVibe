"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ProjectListItem {
  id: string;
  name: string;
  repoPath: string | null;
  repoUrl: string | null;
  createdAt: string;
  flows: { id: string }[];
}

export default function Home() {
  const [projects, setProjects] = useState<ProjectListItem[] | null>(null);
  const [name, setName] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/projects");
    setProjects(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || (!repoPath.trim() && !repoUrl.trim())) {
      setError("Give it a name and a local path or GitHub URL");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, repoPath: repoPath || undefined, repoUrl: repoUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setName("");
      setRepoPath("");
      setRepoUrl("");
      await load();
      window.location.href = `/projects/${data.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-neutral-400 mt-1 max-w-2xl">
          Connect a codebase, then point your own Claude session (Claude Code / Desktop) at its MCP
          endpoint. Claude reads the real source, discovers user flows (Login, Signup, Checkout...),
          checks each step against the code, and reports issues here — each with a ready-to-paste fix
          prompt. Nothing runs in a browser.
        </p>
      </div>

      <form onSubmit={createProject} className="card flex flex-col gap-3">
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Project name</label>
          <input className="input" placeholder="My SaaS" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Local repo path</label>
            <input
              className="input"
              placeholder="/Users/you/Projects/myapp"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">GitHub repo URL</label>
            <input
              className="input"
              placeholder="https://github.com/you/myapp"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-neutral-600">
          These are just context shown to the connecting AI — at least one is required.
        </p>
        <div>
          <button className="btn-primary" disabled={creating} type="submit">
            {creating ? "Creating…" : "+ New project"}
          </button>
        </div>
      </form>
      {error && <p className="text-red-400 text-sm -mt-4">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        {projects === null && <p className="text-neutral-500 text-sm">Loading…</p>}
        {projects?.length === 0 && (
          <p className="text-neutral-500 text-sm">No projects yet — create one above to get started.</p>
        )}
        {projects?.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="card hover:border-indigo-500/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-medium">{p.name}</h2>
                <p className="text-sm text-neutral-500 mt-0.5">{p.repoPath || p.repoUrl}</p>
              </div>
              <span className="badge bg-neutral-800 text-neutral-300">{p.flows.length} flow(s)</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
