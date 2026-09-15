"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { IconType } from "react-icons";
import {
  FiArrowLeft,
  FiBriefcase,
  FiFolder,
  FiGrid,
  FiLogOut,
  FiUsers,
} from "react-icons/fi";

const LINKS: [string, string, IconType][] = [
  ["Overview", "/admin", FiGrid],
  ["Users", "/admin/users", FiUsers],
  ["Workspaces", "/admin/workspaces", FiBriefcase],
  ["Projects", "/admin/projects", FiFolder],
];

export default function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="workspace-shell">
      <header className="topbar">
        <Link className="brand" href="/admin">
          <span className="brand-mark">✓</span> TestMyVibe
        </Link>
        <span className="top-divider" />
        <span
          className="badge"
          style={{ background: "rgba(57,124,246,.15)", color: "#70a2ff" }}
        >
          Super admin
        </span>
        <span className="top-context">Usage across every workspace</span>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm"
        >
          <FiArrowLeft aria-hidden="true" /> Exit to workspace
        </Link>
        <span className="avatar" title={email}>
          {email.slice(0, 1).toUpperCase()}
        </span>
      </header>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="workspace-label">
            <span className="workspace-icon">A</span>
            <div>
              <strong>Super admin</strong>
              <small>{email}</small>
            </div>
          </div>
        </div>
        <div className="sidebar-navigation">
          <p className="nav-heading">ADMIN</p>
          <nav>
            {LINKS.map(([label, href, Icon]) => (
              <Link
                key={href}
                href={href}
                title={label}
                aria-label={label}
                className={
                  "nav-link " + (pathname === href ? "active" : "")
                }
              >
                <Icon aria-hidden="true" />
                <span className="nav-label">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <button
            onClick={async () => {
              const res = await fetch("/api/auth", { method: "DELETE" });
              if (res.ok) router.push("/login");
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
