"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";

interface ProjectListItem {
  id: string;
  name: string;
}

const PROJECT_NAV = [
  { href: "", label: "Dashboard", icon: "📊" },
  { href: "/issues", label: "Issues", icon: "🗂️" },
  { href: "/flows", label: "Flows", icon: "🧭" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ projectId?: string }>();
  const [projects, setProjects] = useState<ProjectListItem[] | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const activeProjectId = params?.projectId ?? null;
  const activeProject = projects?.find((p) => p.id === activeProjectId) ?? null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/projects");
      if (res.ok && !cancelled) setProjects(await res.json());
    }
    load();
    return () => {
      cancelled = true;
    };
    // Refetch whenever route changes, in case a project was created/renamed/deleted.
  }, [pathname]);

  return (
    <div className="min-h-full flex">
      <aside className="w-64 shrink-0 border-r border-neutral-800 flex flex-col">
        <Link href="/" className="flex items-center gap-2 px-5 py-4 border-b border-neutral-800 font-semibold">
          🧪 TestMyVibe
        </Link>

        <div className="relative px-3 py-3 border-b border-neutral-800">
          <button
            className="w-full flex items-center justify-between rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:border-neutral-600"
            onClick={() => setSwitcherOpen((v) => !v)}
          >
            <span className="truncate">{activeProject ? activeProject.name : "Org dashboard"}</span>
            <span className="text-neutral-500 text-xs">▾</span>
          </button>
          {switcherOpen && (
            <div
              className="absolute left-3 right-3 mt-1 rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl z-20 py-1 max-h-80 overflow-y-auto"
              onMouseLeave={() => setSwitcherOpen(false)}
            >
              <Link
                href="/"
                className="block px-3 py-2 text-sm hover:bg-neutral-800"
                onClick={() => setSwitcherOpen(false)}
              >
                📊 Org dashboard
              </Link>
              <Link
                href="/projects"
                className="block px-3 py-2 text-sm hover:bg-neutral-800"
                onClick={() => setSwitcherOpen(false)}
              >
                🗃️ Manage projects
              </Link>
              <div className="my-1 border-t border-neutral-800" />
              {projects === null && <p className="px-3 py-2 text-xs text-neutral-600">Loading…</p>}
              {projects?.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className={`block px-3 py-2 text-sm hover:bg-neutral-800 truncate ${
                    p.id === activeProjectId ? "text-indigo-300" : ""
                  }`}
                  onClick={() => setSwitcherOpen(false)}
                >
                  {p.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-3 flex flex-col gap-1">
          {activeProjectId ? (
            PROJECT_NAV.map((item) => {
              const href = `/projects/${activeProjectId}${item.href}`;
              const active = pathname === href || (item.href === "" && pathname === `/projects/${activeProjectId}`);
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    active ? "bg-indigo-500/10 text-indigo-300" : "text-neutral-300 hover:bg-neutral-800"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })
          ) : (
            <>
              <Link
                href="/"
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  pathname === "/" ? "bg-indigo-500/10 text-indigo-300" : "text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                📊 Dashboard
              </Link>
              <Link
                href="/projects"
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  pathname === "/projects" ? "bg-indigo-500/10 text-indigo-300" : "text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                🗃️ Projects
              </Link>
            </>
          )}
        </nav>

        <div className="px-5 py-3 border-t border-neutral-800 text-[11px] text-neutral-600">
          test-case generator & flow auditor
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-8 py-8">{children}</main>
    </div>
  );
}
