"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

/* ---------------------------------------------------------------------- */
/* Shared: count-up number                                                 */
/* ---------------------------------------------------------------------- */

function CountUp({ to, ms = 900 }: { to: number; ms?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    function step(now: number) {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{n}</>;
}

/* ---------------------------------------------------------------------- */
/* Page 1: Overview                                                        */
/* ---------------------------------------------------------------------- */

const AUDIT_ROWS: { status: "passed" | "blocked"; label: string }[] = [
  { status: "passed", label: "Signup → verify email → onboarding" },
  { status: "passed", label: "Login → dashboard" },
  { status: "blocked", label: "Forgot password → reset → sign in" },
  { status: "passed", label: "Billing: subscribe, sync, cancel" },
];

function OverviewPage() {
  const [visibleRows, setVisibleRows] = useState(0);
  useEffect(() => {
    setVisibleRows(0);
    const id = setInterval(() => {
      setVisibleRows((v) => (v < AUDIT_ROWS.length ? v + 1 : v));
    }, 260);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="page-fade">
      <h3>
        AgencyLoop <span>Audit status, user flows, and approved fixes</span>
      </h3>
      <div className="stat-row">
        <div className="stat-card">
          <strong>
            <CountUp to={20} />
          </strong>
          <span>Flows</span>
        </div>
        <div className="stat-card">
          <strong>
            <CountUp to={22} />
          </strong>
          <span>Audit runs</span>
        </div>
        <div className="stat-card">
          <strong className="accent-amber">
            <CountUp to={4} />
          </strong>
          <span>Open issues</span>
        </div>
        <div className="stat-card">
          <strong className="accent-green">
            <CountUp to={2} />
          </strong>
          <span>Resolved</span>
        </div>
      </div>
      <div className="stat-mini-row">
        {[
          ["1", "pending"],
          ["1", "approved"],
          ["1", "in progress"],
          ["1", "in review"],
          ["2", "done"],
          ["0", "rejected"],
        ].map(([n, label]) => (
          <div className={"stat-mini stat-mini-" + label.replace(" ", "-")} key={label}>
            <strong>{n}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <h4 className="section-label">Recent audit runs</h4>
      <div className="audit-list">
        {AUDIT_ROWS.slice(0, visibleRows).map((row) => (
          <div className="audit-row" key={row.label}>
            <span className={"audit-tag audit-" + row.status}>
              {row.status}
            </span>
            <p>{row.label}</p>
            <span className="audit-count">0 issue(s)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Page 2: Issue board (kanban pipeline animation)                         */
/* ---------------------------------------------------------------------- */

type Task = {
  id: string;
  title: string;
  ticket: string;
  tag: string;
  tagClass: string;
};

const TASKS: Task[] = [
  {
    id: "checkout",
    title: "Validate checkout inputs",
    ticket: "TMV-101",
    tag: "VALIDATION",
    tagClass: "sample-tag",
  },
  {
    id: "keyboard",
    title: "Improve keyboard navigation",
    ticket: "TMV-103",
    tag: "ACCESSIBILITY",
    tagClass: "sample-tag tag-1",
  },
  {
    id: "upload",
    title: "Add upload error recovery",
    ticket: "TMV-105",
    tag: "ERROR HANDLING",
    tagClass: "sample-tag tag-2",
  },
];

const COLUMNS = ["PENDING REVIEW", "APPROVED", "IN PROGRESS", "IN REVIEW"];

// Each move is [taskIndex, targetColumnIndex]. This staggers the three
// tasks through the pipeline one hop at a time until all three land in
// "IN REVIEW", mirroring how a real queue drains.
const MOVES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 1],
  [0, 3],
  [1, 2],
  [2, 1],
  [1, 3],
  [2, 2],
  [2, 3],
];

const STEP_MS = 2600;
const RESET_PAUSE_MS = 4000;

function IssueBoardPage() {
  const [positions, setPositions] = useState<number[]>([0, 0, 0]);
  const [movedTaskId, setMovedTaskId] = useState<string | null>(null);
  const [flashCol, setFlashCol] = useState<number | null>(null);
  const stepRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stepRef.current = 0;
    setPositions([0, 0, 0]);

    function tick() {
      if (stepRef.current < MOVES.length) {
        const [taskIndex, toCol] = MOVES[stepRef.current];
        setPositions((prev) => {
          const next = [...prev];
          next[taskIndex] = toCol;
          return next;
        });
        setMovedTaskId(TASKS[taskIndex].id);
        setFlashCol(toCol);
        stepRef.current += 1;
        timeoutRef.current = setTimeout(tick, STEP_MS);
      } else {
        timeoutRef.current = setTimeout(() => {
          setPositions([0, 0, 0]);
          setMovedTaskId(null);
          setFlashCol(null);
          stepRef.current = 0;
          timeoutRef.current = setTimeout(tick, STEP_MS);
        }, RESET_PAUSE_MS);
      }
    }

    timeoutRef.current = setTimeout(tick, STEP_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (movedTaskId === null && flashCol === null) return;
    const id = setTimeout(() => {
      setMovedTaskId(null);
      setFlashCol(null);
    }, 700);
    return () => clearTimeout(id);
  }, [movedTaskId, flashCol]);

  return (
    <div className="page-fade">
      <h3>
        Issue board <span>Continuous quality, clear ownership</span>
      </h3>
      <div className="preview-columns">
        {COLUMNS.map((title, colIndex) => {
          const cards = TASKS.filter((_, i) => positions[i] === colIndex);
          return (
            <div key={title} className={flashCol === colIndex ? "col-flash" : ""}>
              <h4>
                {title}
                <span>{cards.length}</span>
              </h4>
              {cards.map((task) => (
                <article
                  key={task.id}
                  className={
                    "kanban-card" +
                    (movedTaskId === task.id ? " card-arrived" : "")
                  }
                >
                  <span className={task.tagClass}>{task.tag}</span>
                  <p>{task.title}</p>
                  <footer>
                    {task.ticket}
                    <span>↗</span>
                  </footer>
                </article>
              ))}
              {cards.length === 0 && colIndex !== 0 && (
                <div className="col-empty" />
              )}
            </div>
          );
        })}
        <div className="preview-columns-extra">
          <h4>
            DONE<span>2</span>
          </h4>
          <article className="kanban-card">
            <span className="sample-tag tag-1">MISSING-NAVIGATION</span>
            <p>Billing page controls shown to every role</p>
            <footer>
              TMV-098<span>↗</span>
            </footer>
          </article>
        </div>
        <div className="preview-columns-extra">
          <h4>
            REJECTED<span>0</span>
          </h4>
          <p className="col-note">No issues</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Page 3: Feature graph                                                   */
/* ---------------------------------------------------------------------- */

type Node = {
  id: string;
  label: string;
  x: number;
  y: number;
  status: "covered" | "pending" | "issues" | "progress";
};

const GRAPH_NODES: Node[] = [
  { id: "n1", label: "Marketing home", x: 40, y: 40, status: "covered" },
  { id: "n2", label: "Choose pricing", x: 190, y: 30, status: "pending" },
  { id: "n3", label: "Log in", x: 340, y: 45, status: "issues" },
  { id: "n4", label: "Create account", x: 490, y: 35, status: "pending" },
  { id: "n5", label: "Sign up", x: 190, y: 120, status: "covered" },
  { id: "n6", label: "Forgot password", x: 340, y: 130, status: "covered" },
  { id: "n7", label: "Verify email", x: 490, y: 125, status: "issues" },
  { id: "n8", label: "Onboarding", x: 340, y: 210, status: "covered" },
  { id: "n9", label: "Billing", x: 490, y: 205, status: "progress" },
];

const GRAPH_EDGES: [string, string][] = [
  ["n1", "n2"],
  ["n2", "n3"],
  ["n3", "n4"],
  ["n3", "n5"],
  ["n5", "n6"],
  ["n6", "n7"],
  ["n5", "n8"],
  ["n8", "n9"],
  ["n6", "n8"],
];

const STATUS_COLOR: Record<Node["status"], string> = {
  covered: "#3ddc97",
  pending: "#e8c15a",
  issues: "#f06a6a",
  progress: "#5b9bf2",
};

function FeatureGraphPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    setActiveIdx(0);
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % GRAPH_NODES.length);
    }, 750);
    return () => clearInterval(id);
  }, []);

  const nodeById = Object.fromEntries(GRAPH_NODES.map((n) => [n.id, n]));

  return (
    <div className="page-fade">
      <h3>
        Feature graph <span>Discovered surface area, mapped and scored</span>
      </h3>
      <div className="stat-row stat-row-compact">
        <div className="stat-card">
          <strong>
            <CountUp to={86} />
          </strong>
          <span>Nodes</span>
        </div>
        <div className="stat-card">
          <strong>
            <CountUp to={111} />
          </strong>
          <span>Connections</span>
        </div>
        <div className="stat-card">
          <strong className="accent-green">
            <CountUp to={70} />%
          </strong>
          <span>Coverage</span>
        </div>
        <div className="stat-card">
          <strong className="accent-amber">
            <CountUp to={20} />
          </strong>
          <span>Issues</span>
        </div>
      </div>
      <div className="graph-card">
        <svg viewBox="0 0 560 250" className="graph-svg">
          {GRAPH_EDGES.map(([a, b]) => {
            const na = nodeById[a];
            const nb = nodeById[b];
            return (
              <line
                key={a + b}
                x1={na.x}
                y1={na.y}
                x2={nb.x}
                y2={nb.y}
                stroke="#2a3444"
                strokeWidth={1.5}
              />
            );
          })}
          {GRAPH_NODES.map((n, i) => (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={i === activeIdx ? 10 : 7}
                fill={STATUS_COLOR[n.status]}
                stroke={i === activeIdx ? "#fff" : "none"}
                strokeWidth={2}
                className="graph-node"
              />
              <text x={n.x} y={n.y + 22} className="graph-label">
                {n.label}
              </text>
            </g>
          ))}
        </svg>
        <div className="graph-legend">
          <span>
            <i style={{ background: STATUS_COLOR.covered }} /> Covered
          </span>
          <span>
            <i style={{ background: STATUS_COLOR.pending }} /> Pending
          </span>
          <span>
            <i style={{ background: STATUS_COLOR.issues }} /> Has issues
          </span>
          <span>
            <i style={{ background: STATUS_COLOR.progress }} /> In progress
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Page 4: User flows                                                      */
/* ---------------------------------------------------------------------- */

const FLOWS = [
  {
    title: "Signup → Verify email → Onboarding",
    desc: "New user creates an account, verifies with a code, and lands in the app.",
    runs: 2,
  },
  {
    title: "Login → Dashboard",
    desc: "Existing user signs in and reaches the dashboard.",
    runs: 1,
  },
  {
    title: "Forgot password → Reset → Sign in",
    desc: "User requests a reset code, resets their password, and signs back in.",
    runs: 1,
  },
  {
    title: "Billing: subscribe, sync, cancel",
    desc: "Workspace owner subscribes, the app syncs status, and can cancel.",
    runs: 1,
  },
];

function UserFlowsPage() {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    setVisible(0);
    const id = setInterval(() => {
      setVisible((v) => (v < FLOWS.length ? v + 1 : v));
    }, 320);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="page-fade">
      <h3>
        Flows <span>Auto-discovered by your connected AI</span>
      </h3>
      <div className="flow-grid">
        {FLOWS.slice(0, visible).map((f) => (
          <div className="flow-card" key={f.title}>
            <div className="flow-card-top">
              <strong>{f.title}</strong>
              <span className="flow-badge">AI-discovered</span>
            </div>
            <p>{f.desc}</p>
            <span className="flow-runs">{f.runs} audit run(s)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Page 5: Settings / MCP connection                                       */
/* ---------------------------------------------------------------------- */

const TOOLS = ["Other AI tool", "Claude Code", "Cursor", "VS Code", "Codex"];

function SettingsPage() {
  const [activeTool, setActiveTool] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setActiveTool(0);
    const id = setInterval(() => {
      setActiveTool((t) => (t + 1) % TOOLS.length);
    }, 1100);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      setCopied(true);
      const off = setTimeout(() => setCopied(false), 1000);
      return () => clearTimeout(off);
    }, 3400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="page-fade">
      <h3>
        Settings <span>Connect your AI tool and schedule the quality loop</span>
      </h3>
      <div className="settings-card">
        <div className="tool-tabs">
          {TOOLS.map((t, i) => (
            <span key={t} className={i === activeTool ? "tool-tab active" : "tool-tab"}>
              {t}
            </span>
          ))}
        </div>
        <div className="code-block">
          <div>Transport: Streamable HTTP</div>
          <div>URL: http://localhost:3000/api/mcp</div>
          <div>Authorization: Bearer YOUR_PROJECT_TOKEN</div>
        </div>
        <div className="settings-actions">
          <span className="btn-mini">Copy setup</span>
          <span className="btn-mini">Reveal token</span>
          {copied && <span className="toast">Copied!</span>}
        </div>
        <div className="cadence-row">
          <div className="cadence-field">
            <span>Audit cadence</span>
            <strong>Every 60 min</strong>
          </div>
          <div className="cadence-field">
            <span>Fix cadence</span>
            <strong>Every 30 min</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Orchestrator                                                            */
/* ---------------------------------------------------------------------- */

type PageDef = {
  id: string;
  label: string;
  icon: string;
  Comp: ComponentType;
  ms?: number;
};

// Full dashboard tour — re-enable by uncommenting the other pages below
// and restoring the auto-advance effect underneath.
const PAGES: PageDef[] = [
  // { id: "overview", label: "Overview", icon: "◫", Comp: OverviewPage },
  { id: "issues", label: "Issue board", icon: "▤", Comp: IssueBoardPage },
  // { id: "graph", label: "Feature graph", icon: "◈", Comp: FeatureGraphPage },
  // { id: "flows", label: "User flows", icon: "☰", Comp: UserFlowsPage },
  // { id: "settings", label: "Settings", icon: "⚙", Comp: SettingsPage },
];

// Sidebar keeps showing the full nav for context even while only the
// Issue board is actively looping.
const SIDEBAR_ITEMS = [
  { id: "overview", label: "Overview", icon: "◫" },
  { id: "issues", label: "Issue board", icon: "▤" },
  { id: "graph", label: "Feature graph", icon: "◈" },
  { id: "flows", label: "User flows", icon: "☰" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

// const DEFAULT_PAGE_MS = 5200;

export default function LandingPreview() {
  const active = PAGES[0];
  const Active = active.Comp;

  // Multi-page auto-advance (disabled while only the Issue board loops).
  // const [pageIndex, setPageIndex] = useState(0);
  // const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // const pageIndexRef = useRef(0);
  //
  // useEffect(() => {
  //   const reduceMotion =
  //     typeof window !== "undefined" &&
  //     window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  //   if (reduceMotion) return;
  //
  //   function advance() {
  //     const current = PAGES[pageIndexRef.current];
  //     timeoutRef.current = setTimeout(() => {
  //       pageIndexRef.current = (pageIndexRef.current + 1) % PAGES.length;
  //       setPageIndex(pageIndexRef.current);
  //       advance();
  //     }, current.ms ?? DEFAULT_PAGE_MS);
  //   }
  //   advance();
  //   return () => {
  //     if (timeoutRef.current) clearTimeout(timeoutRef.current);
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  return (
    <div className="preview">
      <div className="preview-top">
        <span className="brand-mark">✓</span>
        <strong>AgencyLoop</strong>
        <span>/</span> {active.label}
        <span className="preview-label">LIVE PREVIEW</span>
      </div>
      <div className="preview-content">
        <aside>
          PROJECT
          {SIDEBAR_ITEMS.map((p) => (
            <strong
              key={p.id}
              className={p.id === active.id ? "selected" : ""}
            >
              {p.icon} {p.label}
            </strong>
          ))}
        </aside>
        <div className="preview-board">
          <Active key={active.id} />
        </div>
      </div>
    </div>
  );
}
