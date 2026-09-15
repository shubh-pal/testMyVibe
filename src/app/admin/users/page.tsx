"use client";
import { useEffect, useState } from "react";
import { checkedFetch } from "@/lib/client-fetch";
import LoadError from "@/components/LoadError";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  isSuperAdmin: boolean;
  workspace: { id: string; name: string; projectCount: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    checkedFetch("/api/admin/users")
      .then(async (res) => {
        if (!cancelled) setUsers(await res.json());
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Connection failed."),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) return <LoadError message={loadError} />;
  if (!users) return <p className="text-neutral-500 text-sm">Loading… (querying every workspace — can take a few seconds)</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-neutral-500 text-sm mt-1">
          {users.length} signup{users.length === 1 ? "" : "s"} across every
          workspace.
        </p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="font-medium px-4 py-3">Email</th>
              <th className="font-medium px-4 py-3">Name</th>
              <th className="font-medium px-4 py-3">Workspace</th>
              <th className="font-medium px-4 py-3">Projects</th>
              <th className="font-medium px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-neutral-800 last:border-0"
              >
                <td className="px-4 py-3 font-medium">
                  {u.email}
                  {u.isSuperAdmin && (
                    <span className="badge bg-indigo-500/15 text-indigo-400 ml-2">
                      admin
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-300">{u.name}</td>
                <td className="px-4 py-3 text-neutral-300">
                  {u.workspace.name}
                </td>
                <td className="px-4 py-3 text-neutral-300">
                  {u.workspace.projectCount}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {new Date(u.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
