"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import type { IconType } from "react-icons";
import {
  FiActivity,
  FiChevronsLeft,
  FiChevronsRight,
  FiClipboard,
  FiFolder,
  FiGitBranch,
  FiGrid,
  FiList,
  FiLogOut,
  FiSettings,
} from "react-icons/fi";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ projectId?: string }>();
  const router = useRouter();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [user, setUser] = useState<{
    name: string;
    workspace: { name: string };
    isSuperAdmin?: boolean;
  } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState("");
  const [runProjectId, setRunProjectId] = useState<string | null>(null);
  const publicPage =
    pathname === "/" ||
    pathname === "/v2" ||
    pathname === "/login" ||
    pathname === "/signup";
  const runId = pathname.match(/^\/runs\/([^/]+)$/)?.[1];
  useEffect(() => {
    if (publicPage) return;
    let active = true;
    Promise.all([fetch("/api/auth"), fetch("/api/projects")])
      .then(async ([a, p]) => {
        if (a.status === 401) {
          router.replace("/login");
          return;
        }
        if (!a.ok || !p.ok) throw new Error("Unable to load workspace");
        const [u, list] = await Promise.all([a.json(), p.json()]);
        if (active) {
          setUser(u);
          setProjects(list);
        }
      })
      .catch(() => {
        if (active)
          setError("Unable to load workspace. Please refresh to retry.");
      });
    return () => {
      active = false;
    };
  }, [pathname, publicPage, router]);

  useEffect(() => {
    let active = true;
    if (!runId) {
      void Promise.resolve().then(() => {
        if (active) setRunProjectId(null);
      });
      return () => {
        active = false;
      };
    }

    void fetch(`/api/runs/${runId}`)
      .then(async (response) => {
        if (!response.ok) return null;
        const run = await response.json();
        return run.flow?.project?.id ?? null;
      })
      .then((projectId) => {
        if (active) setRunProjectId(projectId);
      })
      .catch(() => {
        if (active) setRunProjectId(null);
      });

    return () => {
      active = false;
    };
  }, [runId]);
  if (publicPage) return children;
  if (!user)
    return (
      <div className="p-10" role="status">
        {error || "Loading your workspace…"}
      </div>
    );
  // /admin has its own shell (AdminShell, via src/app/admin/layout.tsx) with
  // a separate sidebar — the auth check above still applies, but skip the
  // regular workspace chrome so the two shells don't nest.
  if (pathname === "/admin" || pathname.startsWith("/admin/"))
    return <>{children}</>;
  if (runId && !runProjectId)
    return (
      <div className="p-10" role="status">
        Loading the audit report context…
      </div>
    );
  const activeProjectId = params.projectId ?? runProjectId;
  const project = projects.find((p) => p.id === activeProjectId);
  const base = project ? "/projects/" + project.id : "";
  const links: [string, string, IconType][] = project
    ? [
        ["Overview", base, FiGrid],
        ["Issue board", base + "/issues", FiClipboard],
        ["Feature graph", base + "/graph", FiGitBranch],
        ["User flows", base + "/flows", FiList],
        ["Settings", base + "/settings", FiSettings],
      ]
    : [
        ["Overview", "/dashboard", FiGrid],
        ["Projects", "/projects", FiFolder],
      ];
  return (
    <div
      className={`workspace-shell ${collapsed ? "sidebar-collapsed" : ""} ${pathname.endsWith("/graph") ? "graph-workspace" : ""}`}
    >
      <header className="topbar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">✓</span> TestMyVibe
        </Link>
        <span className="top-divider" />
        <Link href="/projects">Projects</Link>
        {user.isSuperAdmin && (
          <Link href="/admin" className="flex items-center gap-1.5">
            <FiActivity aria-hidden="true" /> Admin
          </Link>
        )}
        <span className="top-context">Developer quality workspace</span>
        <Link href="/projects" className="btn-primary">
          + Create project
        </Link>
        <span className="avatar" title={user.name}>
          {user.name.slice(0, 1).toUpperCase()}
        </span>
      </header>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="workspace-label">
            <span className="workspace-icon">
              {user.workspace.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.workspace.name}</strong>
              <small>Private workspace</small>
            </div>
          </div>
          <label className="nav-heading" htmlFor="project-switch">
            WORKSPACE
          </label>
          <select
            id="project-switch"
            className="input"
            value={project?.id || ""}
            onChange={(e) =>
              router.push(
                e.target.value ? "/projects/" + e.target.value : "/dashboard",
              )
            }
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sidebar-navigation">
          <p className="nav-heading">{project ? "PROJECT" : "PLANNING"}</p>
          <nav>
            {links.map(([label, href, Icon]) => (
              <Link
                key={href}
                href={href}
                title={label}
                aria-label={label}
                className={"nav-link " + (pathname === href ? "active" : "")}
              >
                <Icon aria-hidden="true" />
                <span className="nav-label">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand main menu" : "Collapse main menu"}
          >
            {collapsed ? (
              <FiChevronsRight aria-hidden="true" />
            ) : (
              <>
                <FiChevronsLeft aria-hidden="true" />
                <span className="sidebar-action-label">Collapse</span>
              </>
            )}
          </button>
          <button
            onClick={async () => {
              const res = await fetch("/api/auth", { method: "DELETE" });
              if (res.ok) {
                setUser(null);
                router.push("/login");
              }
            }}
            className="signout"
          >
            <FiLogOut aria-hidden="true" />
            <span className="sidebar-action-label">Sign out</span>
          </button>
        </div>
      </aside>
      <main className="workspace-main">{children}</main>
    </div>
  );
}
