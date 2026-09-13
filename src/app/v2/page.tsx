import Link from "next/link";
import styles from "./v2.module.css";
import ShotCarousel from "./ShotCarousel";

const FEATURES = [
  [
    "01",
    "Connect your coding agent",
    "Add the project-scoped MCP connection to your preferred AI tool. Your agent reads the source; TestMyVibe keeps the evidence.",
  ],
  [
    "02",
    "Understand every journey",
    "Discover user flows and audit each step. Review concrete findings with file references and focused fix instructions.",
  ],
  [
    "03",
    "Approve what happens next",
    "Approve issues, let your agent claim the queue, and review its changes before marking the work complete.",
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
              Explore the workflow
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

      {/* FEATURES */}
      <section className={styles.features} id="workflow">
        {FEATURES.map(([n, t, d]) => (
          <div className={styles.feature} key={n}>
            <span className={styles.featureIcon}>{n}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        ))}
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

      <footer className={styles.footer}>
        <span>TestMyVibe</span>
        <span>Source-based audits. Human-led decisions.</span>
        <Link href="/login">Open dashboard →</Link>
      </footer>
    </div>
  );
}
