"use client";

import { useEffect, useState, use as usePromise } from "react";

interface ProjectInfo {
  id: string;
  name: string;
  repoPath: string | null;
  repoUrl: string | null;
  mcpToken: string;
}

export default function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = usePromise(params);
  const [project, setProject] = useState<ProjectInfo | null>(null);

  async function load() {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) setProject(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (!project) return <p className="text-neutral-500 text-sm">Loading…</p>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-neutral-500 text-sm">{project.name}</p>
      </div>
      <ConnectPanel project={project} onTokenChanged={load} />
    </div>
  );
}

function ConnectPanel({ project, onTokenChanged }: { project: ProjectInfo; onTokenChanged: () => void }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const mcpUrl = `${origin}/api/mcp`;
  const cliCommand = `claude mcp add --transport http testmyvibe ${mcpUrl} --header "Authorization: Bearer ${project.mcpToken}"`;

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  }

  async function regenerate() {
    if (!confirm("Regenerate the MCP token? Anything already connected with the old token will stop working.")) return;
    setRegenerating(true);
    try {
      await fetch(`/api/projects/${project.id}/regenerate-token`, { method: "POST" });
      onTokenChanged();
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="card flex flex-col gap-3 max-w-2xl">
      <h2 className="font-medium">Connect your AI</h2>
      <p className="text-sm text-neutral-400">
        Add this as an MCP server in Claude Code, Claude Desktop, or any MCP-compatible client, then ask
        it to audit this codebase. It will read the code at{" "}
        <span className="text-neutral-300">{project.repoPath || project.repoUrl}</span> and report flows
        and issues here.
      </p>

      <div>
        <label className="block text-xs text-neutral-400 mb-1">Claude Code CLI</label>
        <div className="flex gap-2">
          <code className="input flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs">{cliCommand}</code>
          <button className="btn-secondary text-xs" onClick={() => copy("cli", cliCommand)}>
            {copied === "cli" ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
        <div>
          <label className="block text-xs text-neutral-400 mb-1">MCP server URL</label>
          <code className="input block overflow-x-auto whitespace-nowrap font-mono text-xs">{mcpUrl}</code>
        </div>
        <button className="btn-secondary text-xs" onClick={() => copy("url", mcpUrl)}>
          {copied === "url" ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Auth token (Bearer)</label>
          <code className="input block overflow-x-auto whitespace-nowrap font-mono text-xs">{project.mcpToken}</code>
        </div>
        <button className="btn-secondary text-xs" onClick={() => copy("token", project.mcpToken)}>
          {copied === "token" ? "Copied!" : "Copy"}
        </button>
      </div>

      <div>
        <button className="btn-danger text-xs" onClick={regenerate} disabled={regenerating}>
          {regenerating ? "Regenerating…" : "Regenerate token"}
        </button>
      </div>
    </div>
  );
}
