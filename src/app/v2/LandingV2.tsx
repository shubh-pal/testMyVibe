import Link from "next/link";
import styles from "./v2.module.css";
import ShotCarousel from "./ShotCarousel";

const STEPS = [
  [
    "01",
    "Connect an MCP",
    "Add TestMyVibe's MCP server to your AI coding tool — Claude Code, Cursor, VS Code, Codex, or any MCP client — using the project token from Settings.",
  ],
  [
    "02",
    "AI builds your feature graph",
    "Your connected agent reads the real source and maps every feature it finds into a scored graph of your product's surface area.",
  ],
  [
    "03",
    "AI generates user journeys",
    "It turns that graph into concrete user flows worth testing — signup, checkout, settings, whatever your product actually does.",
  ],
  [
    "04",
    "AI audits each flow",
    "Each step is checked against the real source, not guessed. Issues are raised with file references and a ready-to-paste fix prompt.",
  ],
  [
    "05",
    "Close issues on the kanban board",
    "Approve or reject findings, let your agent claim and fix approved work, then review the change before marking it done.",
  ],
] as const;

export default function LandingV2() {
  return (
    <div className={styles.page}>
      {/* NAV */}
      <header className={styles.nav}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>✓</span>
          TestMyVibe
        </Link>

        <nav className={styles.navGroup}>
          <a href="#workflow">How it works</a>
          <a href="#community">Open source</a>
          <Link href="/login">Sign in</Link>
          <Link href="/signup" className={styles.openApp}>
            Create workspace&nbsp;→
          </Link>
        </nav>
      </header>

      {/* HERO */}
      <main className={styles.hero}>
        <section className={styles.heroCopy}>
          <div className={styles.eyebrow}>
            <span className={styles.statusDot} /> THE QUALITY LAYER FOR
            AI-BUILT SOFTWARE
          </div>

          <h1 className={styles.heroH1}>
            What&apos;s the most time-consuming part of building with AI?
            <br />
            <span>Testing.</span>
          </h1>

          <p className={styles.heroDescription}>
            An AI QA that needs no hand-holding — it just works on its own to
            find and fix the issues in your code.
          </p>

          <div className={styles.heroActions}>
            <Link href="/signup" className={styles.primaryBtn}>
              Start your workspace&nbsp;→
            </Link>
            <a href="#workflow" className={styles.secondaryBtn}>
              See how it works
            </a>
          </div>

          <div className={styles.checks}>
            <span>Self-hostable</span>
            <span>MCP compatible</span>
            <span>Human approval built in</span>
          </div>
        </section>

        {/* DASHBOARD VISUAL */}
        <section className={styles.heroVisual}>
          <div className={styles.orb} />

          <div className={`${styles.annotation} ${styles.noteOne}`}>
            Audit your product flows
            <br />
            with AI ↗
          </div>
          <div className={`${styles.annotation} ${styles.noteTwo}`}>
            Catch issues
            <br />
            early
          </div>
          <div className={`${styles.annotation} ${styles.noteThree}`}>
            Ship better
            <br />
            experiences
          </div>
          <div className={styles.handNote}>
            Let AI
            <br />
            find what
            <br />
            you miss ↗
          </div>

          <div className={styles.dashboard}>
            <div className={styles.windowBar}>
              <div className={styles.dot} />
              <div className={styles.dot} />
              <div className={styles.dot} />
            </div>
            <ShotCarousel />
          </div>
        </section>
      </main>

      {/* HOW IT WORKS */}
      <section className={styles.workflow} id="workflow">
        <div className={styles.eyebrow}>
          <span className={styles.statusDot} /> HOW IT WORKS
        </div>
        <h2 className={styles.sectionHeading}>
          Connect MCP and let your AI audit and test your Vibe Coded
          application.
        </h2>
        <p className={styles.workflowIntro}>
          TestMyVibe doesn&apos;t read your code or run audits by itself —
          your own AI coding tool does that over{" "}
          <strong>MCP (Model Context Protocol)</strong>. Create a project,
          copy its connection details from Settings into Claude Code, Cursor,
          VS Code, Codex, or any other MCP client, then ask it to get started.
          Everything below is what happens next.
        </p>

        <div className={styles.stepList}>
          {STEPS.map(([n, t, d]) => (
            <div className={styles.step} key={n}>
              <span className={styles.featureIcon}>{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>

        <div className={styles.ctaRow}>
          <Link href="/signup" className={styles.primaryBtn}>
            Create a project&nbsp;→
          </Link>
          <span className={styles.ctaHint}>
            Already have a workspace?{" "}
            <Link href="/login">Sign in and open a project&apos;s
            Settings</Link>{" "}
            to connect an MCP client.
          </span>
        </div>
      </section>

      {/* TOOLS */}
      <section className={styles.tools}>
        <div>
          <div className={styles.toolLabel}>WORKS WITH YOUR FAVORITE TOOLS</div>
          <div className={styles.toolList}>
            <div className={styles.tool}>
              <div className={styles.toolIcon}>▲</div>
              Cursor
            </div>
            <div className={styles.tool}>
              <div className={styles.toolIcon}>◆</div>
              VS Code
            </div>
            <div className={styles.tool}>
              <div className={styles.toolIcon}>✳</div>
              Claude
            </div>
            <div className={styles.tool}>
              <div className={styles.toolIcon}>◎</div>
              Codex
            </div>
            <div className={styles.tool}>
              <div className={styles.toolIcon}>+</div>
              Any AI tool
            </div>
          </div>
        </div>
      </section>

      {/* OPEN SOURCE */}
      <section id="community" className={styles.opensource}>
        <div>
          <strong>Your code. Your tools. Your workflow.</strong>
          <p>
            Run it yourself, inspect the implementation, and help improve it.
            Connect any client that supports MCP over HTTP with bearer
            authentication.
          </p>
        </div>
        <Link href="/signup" className={styles.star}>
          Build a better feedback loop&nbsp;→
        </Link>
      </section>

      {/* CREATOR */}
      <section className={styles.creator}>
        <div>
          <div className={styles.creatorEyebrow}>
            <span className={styles.creatorDot} /> WHO&apos;S BEHIND THIS
          </div>
          <h2 className={styles.creatorHeading}>Made by Shubh Palan.</h2>
          <p className={styles.creatorCopy}>
            TestMyVibe is an independent project I designed and built end to
            end — from the first idea and product strategy to the AI
            workflows and the dashboard you&apos;re using right now. I enjoy
            turning tedious engineering busywork into tools that just work.
          </p>
          <div className={styles.creatorChips}>
            <div className={styles.creatorChip}>
              <span className={styles.creatorChipIcon}>{"</>"}</span>
              <div>
                <strong>Engineer</strong>
                <span>by craft</span>
              </div>
            </div>
            <div className={styles.creatorChip}>
              <span className={styles.creatorChipIcon}>⚙</span>
              <div>
                <strong>Builder</strong>
                <span>by choice</span>
              </div>
            </div>
            <div className={styles.creatorChip}>
              <span className={styles.creatorChipIcon}>♥</span>
              <div>
                <strong>Product-minded</strong>
                <span>by nature</span>
              </div>
            </div>
          </div>
          <a
            className={styles.star}
            href="https://shubh.websight.pro"
            target="_blank"
            rel="noopener noreferrer"
          >
            Let&apos;s talk&nbsp;→
          </a>
        </div>
        <div className={styles.creatorPortraitWrap}>
          <div className={styles.creatorGlow} />
          <img
            src="/assets/me/shubh-portrait-clean.png"
            alt="Illustrated portrait of Shubh Palan"
            className={styles.creatorPortrait}
          />
        </div>
      </section>

      <footer className={styles.footer}>
        <span>TestMyVibe</span>
        <span>Source-based audits. Human-led decisions.</span>
        <Link href="/login">Open dashboard →</Link>
      </footer>
    </div>
  );
}
