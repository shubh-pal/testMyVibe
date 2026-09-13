"use client";
import { useEffect, useState, use as usePromise } from "react";
import { createSchedulingPrompt, formatSchedule } from "@/lib/automation";
interface Project {
  id: string;
  name: string;
  mcpToken: string;
  autoApproveIssues: boolean;
  autoCloseIssues: boolean;
}
const clients = ["Other AI tool", "Claude Code", "Cursor", "VS Code", "Codex"];
const MIN_INTERVAL_MINUTES = 5;
const MAX_INTERVAL_MINUTES = 10_080;

function isValidInterval(minutes: number) {
  return (
    Number.isInteger(minutes) &&
    minutes >= MIN_INTERVAL_MINUTES &&
    minutes <= MAX_INTERVAL_MINUTES
  );
}
export default function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = usePromise(params);
  const [project, setProject] = useState<Project | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [client, setClient] = useState(clients[0]);
  const [origin, setOrigin] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [auditMinutes, setAuditMinutes] = useState("60");
  const [fixMinutes, setFixMinutes] = useState("30");
  useEffect(() => {
    fetch("/api/projects/" + projectId)
      .then(async (r) => {
        if (!r.ok) throw new Error("Project unavailable");
        setProject(await r.json());
        setOrigin(window.location.origin);
      })
      .catch((e) => setMessage(e.message));
  }, [projectId]);
  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setMessage("Clipboard unavailable. Select and copy the text manually.");
    }
  }
  if (!project)
    return <p role="status">{message || "Loading connection settings…"}</p>;
  const url = origin + "/api/mcp";
  const auditInterval = Number(auditMinutes);
  const fixInterval = Number(fixMinutes);
  const validIntervals =
    isValidInterval(auditInterval) && isValidInterval(fixInterval);
  const schedulingPrompt = createSchedulingPrompt(
    validIntervals ? auditInterval : 60,
    validIntervals ? fixInterval : 30,
  );
  const token = showToken ? project.mcpToken : "YOUR_PROJECT_TOKEN";
  const codexConfig = `[mcp_servers.testmyvibe]
url = "${url}"
http_headers = { Authorization = "Bearer ${token}" }
default_tools_approval_mode = "prompt"`;
  const config =
    client === "Claude Code"
      ? `claude mcp add --transport http testmyvibe ${url} --header "Authorization: Bearer ${token}"`
      : client === "Codex"
        ? codexConfig
        : client === "Other AI tool"
          ? `Transport: Streamable HTTP\nURL: ${url}\nAuthorization: Bearer ${token}`
          : JSON.stringify(
              {
                [client === "VS Code" ? "servers" : "mcpServers"]: {
                  testmyvibe: {
                    ...(client === "VS Code" ? { type: "http" } : {}),
                    url,
                    headers: { Authorization: "Bearer " + token },
                  },
                },
              },
              null,
              2,
            );
  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Project settings</h1>
        <p className="text-neutral-500 mt-2">
          Connect your preferred agent to {project.name}.
        </p>
      </div>
      <section className="card flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-medium">Issue automation</h2>
          <p className="text-sm text-neutral-400 mt-2">
            Settings apply only to {project.name}. Changes are saved immediately
            and affect future issue transitions. Existing issues stay in their
            current columns.
          </p>
        </div>
        {(
          [
            [
              "autoApproveIssues",
              "Auto-approve new issues",
              "New findings go straight to Approved, where your connected agent can claim them for fixing.",
            ],
            [
              "autoCloseIssues",
              "Auto-close submitted fixes",
              "When your agent submits a resolution, move the issue directly to Done without manual review. This does not independently verify the fix.",
            ],
          ] as const
        ).map(([key, label, description]) => (
          <label
            key={key}
            className="flex items-start justify-between gap-6 rounded-lg border border-neutral-700 p-4"
          >
            <span>
              <strong className="text-sm">{label}</strong>
              <span className="block text-sm text-neutral-400 mt-1">
                {description}
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              className="mt-1 h-5 w-5 shrink-0 accent-blue-500"
              checked={project[key]}
              disabled={savingSettings}
              onChange={async (event) => {
                const value = event.target.checked;
                setSavingSettings(true);
                setSettingsMessage("");
                try {
                  const response = await fetch("/api/projects/" + projectId, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ [key]: value }),
                  });
                  if (!response.ok)
                    throw new Error(
                      "Could not save settings. Please try again.",
                    );
                  setProject(await response.json());
                  setSettingsMessage(
                    `${label} ${value ? "enabled" : "disabled"}.`,
                  );
                } catch (error) {
                  setSettingsMessage(
                    error instanceof Error
                      ? error.message
                      : "Could not save settings.",
                  );
                } finally {
                  setSavingSettings(false);
                }
              }}
            />
          </label>
        ))}
        <p role="status" className="text-sm text-neutral-400">
          {savingSettings
            ? "Saving…"
            : settingsMessage ||
              "Both options are off by default. You can still manage issues manually."}
        </p>
      </section>
      <section className="card flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-medium">1. Connect your AI tool</h2>
          <p className="text-neutral-400 mt-2 text-sm">
            Use an MCP client with Streamable HTTP and bearer authentication.
            The agent audits the repository already open in its own workspace;
            TestMyVibe never reads your local files. Remote clients cannot reach
            a localhost server.
          </p>
        </div>
        <div className="setup-tabs" role="tablist" aria-label="AI tool">
          {clients.map((c) => (
            <button
              role="tab"
              aria-selected={client === c}
              key={c}
              className="btn-secondary"
              onClick={() => setClient(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="text-sm text-neutral-400">
          {client === "Cursor"
            ? "Add this configuration to .cursor/mcp.json in your project or merge it into your existing MCP settings."
            : client === "VS Code"
              ? "Add this configuration to .vscode/mcp.json, then start the server from VS Code's MCP controls."
              : client === "Codex"
                ? "Reveal the token, then copy this TOML block into ~/.codex/config.toml. Restart Codex after saving it."
                : client === "Claude Code"
                  ? "Run this command from your repository, then check the connection in your MCP settings."
                  : "Open your tool's MCP settings, add a remote HTTP server, and supply this URL and authorization header. If it only supports stdio, use a trusted HTTP bridge supported by that tool."}
        </p>
        <pre className="input overflow-auto whitespace-pre-wrap break-all text-xs leading-6">
          {config}
        </pre>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-secondary"
            onClick={() => copy("config", config)}
          >
            {copied === "config" ? "Copied" : "Copy setup"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => setShowToken(!showToken)}
          >
            {showToken ? "Hide token" : "Reveal token"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => copy("token", project.mcpToken)}
          >
            {copied === "token" ? "Copied" : "Copy token"}
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          This token grants access only to this project. Keep it out of commits
          and shared prompts.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            className="btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMessage("");
              try {
                const r = await fetch("/api/mcp", {
                  method: "POST",
                  headers: {
                    Authorization: "Bearer " + project.mcpToken,
                    "Content-Type": "application/json",
                    Accept: "application/json, text/event-stream",
                  },
                  body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "tools/list",
                    params: {},
                  }),
                });
                const result = await r.json();
                if (!r.ok || result.error)
                  throw new Error(
                    "MCP check failed. Check the endpoint and token.",
                  );
                setMessage(
                  "Server reachable · token accepted · " +
                    result.result.tools.length +
                    " tools available. In your AI client, call get_project to verify its connection and repository access.",
                );
              } catch (e) {
                setMessage(
                  e instanceof Error ? e.message : "Connection failed",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Checking…" : "Run MCP diagnostic"}
          </button>
          <button
            className="btn-danger"
            disabled={busy}
            onClick={async () => {
              if (
                !confirm(
                  "Rotate the token? Existing AI connections will need the new token.",
                )
              )
                return;
              setBusy(true);
              try {
                const r = await fetch(
                  "/api/projects/" + projectId + "/regenerate-token",
                  { method: "POST" },
                );
                if (!r.ok) throw new Error("Could not rotate token");
                const updated = await fetch("/api/projects/" + projectId);
                if (!updated.ok)
                  throw new Error("Refresh to retrieve the new token");
                setProject(await updated.json());
                setMessage("Token rotated. Update your AI clients.");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Rotation failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Rotate token
          </button>
        </div>
        {message && (
          <p role="status" className="text-sm text-indigo-300">
            {message}
          </p>
        )}
      </section>
      <section className="card flex flex-col gap-4">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h2 className="text-lg font-medium">
              2. Schedule your quality loop
            </h2>
            <p className="text-neutral-400 text-sm mt-2">
              One prompt for any scheduling-capable agent.
            </p>
          </div>
          <button
            className="btn-primary shrink-0"
            disabled={!validIntervals}
            onClick={() => copy("schedule", schedulingPrompt)}
          >
            {copied === "schedule" ? "Copied" : "Copy prompt"}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="input flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Audit cadence</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">Every</span>
              <input
                aria-label="Audit interval in minutes"
                className="input w-24 py-1.5 text-center"
                type="number"
                min={MIN_INTERVAL_MINUTES}
                max={MAX_INTERVAL_MINUTES}
                step={5}
                value={auditMinutes}
                onChange={(event) => {
                  if (/^\d{0,5}$/.test(event.target.value))
                    setAuditMinutes(event.target.value);
                }}
              />
              <span className="text-sm">minutes</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {isValidInterval(auditInterval)
                ? formatSchedule(auditInterval)
                : "Choose a valid interval"}{" "}
              · discover user flows and run source audits
            </p>
          </label>
          <label className="input flex flex-col gap-2">
            <span className="text-xs text-neutral-400">Fix cadence</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">Every</span>
              <input
                aria-label="Approved issue fix interval in minutes"
                className="input w-24 py-1.5 text-center"
                type="number"
                min={MIN_INTERVAL_MINUTES}
                max={MAX_INTERVAL_MINUTES}
                step={5}
                value={fixMinutes}
                onChange={(event) => {
                  if (/^\d{0,5}$/.test(event.target.value))
                    setFixMinutes(event.target.value);
                }}
              />
              <span className="text-sm">minutes</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {isValidInterval(fixInterval)
                ? formatSchedule(fixInterval)
                : "Choose a valid interval"}{" "}
              · claim and fix approved issues
            </p>
          </label>
        </div>
        <p className="text-sm text-amber-400">
          Schedules run in your AI tool or external scheduler. Copying this
          prompt does not activate jobs in TestMyVibe. Choose 5–10,080 minutes.
        </p>
        {!validIntervals && (
          <p role="alert" className="text-sm text-red-400">
            Enter whole numbers between 5 and 10,080 minutes before copying.
          </p>
        )}
        <pre className="input whitespace-pre-wrap text-xs leading-6 max-h-96 overflow-auto">
          {schedulingPrompt}
        </pre>
      </section>
    </div>
  );
}
