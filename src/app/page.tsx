import Link from "next/link";
import LandingPreview from "@/components/LandingPreview";
export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link href="/" className="brand">
          <span className="brand-mark">✓</span> TestMyVibe
        </Link>
        <nav>
          <a href="#workflow">How it works</a>
          <a href="#community">Open source</a>
          <Link href="/login">Sign in</Link>
          <Link href="/signup" className="btn-primary">
            Create workspace →
          </Link>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div className="eyebrow">
            <span className="status-dot" /> THE QUALITY LAYER FOR AI-BUILT
            SOFTWARE
          </div>
          <h1>
            What&apos;s the most time-consuming part of building with AI?
            <br />
            <span>Testing.</span>
          </h1>
          <p className="hero-lead">
            An AI QA that needs no hand-holding — it just works on its own to
            find and fix the issues in your code.
          </p>
          <div className="hero-actions">
            <Link className="btn-primary" href="/signup">
              Start your workspace →
            </Link>
            <a className="btn-secondary" href="#workflow">
              Explore the workflow
            </a>
          </div>
          <small>
            Self-hostable · MCP compatible · Human approval built in
          </small>
          <LandingPreview />
        </section>
        <section id="workflow" className="landing-section">
          <div className="eyebrow">FROM SOURCE CODE TO REVIEWED FIXES</div>
          <h2>A practical loop for better software.</h2>
          <div className="feature-grid">
            {[
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
            ].map(([n, t, d]) => (
              <article key={n}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="community" className="community">
          <div>
            <div className="eyebrow">BUILT FOR THE DEVELOPER COMMUNITY</div>
            <h2>Your code. Your tools. Your workflow.</h2>
            <p>
              Run it yourself, inspect the implementation, and help improve it.
              Connect any client that supports MCP over HTTP with bearer
              authentication.
            </p>
          </div>
          <Link href="/signup" className="btn-primary">
            Build a better feedback loop →
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <span>TestMyVibe</span>
        <span>Source-based audits. Human-led decisions.</span>
        <Link href="/login">Open dashboard →</Link>
      </footer>
    </div>
  );
}
