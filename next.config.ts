import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright"],
  async headers() {
    return [
      {
        // Applies to every route. None of this changes app behavior —
        // it's baseline hardening the app had none of before.
        source: "/:path*",
        headers: [
          // No one else may frame this app — blocks clickjacking (tricking
          // a signed-in user into clicking something, e.g. "Sign out" or a
          // future destructive action, inside an invisible iframe).
          { key: "X-Frame-Options", value: "DENY" },
          // Stops the browser guessing a response's content-type from its
          // body instead of trusting the real Content-Type header.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak the full referring URL (which can contain a token
          // or project id) to a third-party site a user navigates to.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Redundant with Cloud Run's own TLS termination, but tells
          // browsers to remember to always use HTTPS for this origin even
          // if something ever links to it over plain http://.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          // Deliberately NOT a full default-src 'self' policy: Next.js's
          // App Router injects inline <script> tags to stream RSC payloads
          // during hydration, so restricting script-src/default-src here
          // breaks every page unless a per-request nonce is plumbed through
          // middleware — real, but separate work from this pass. These
          // three directives are safe to set regardless (nothing in the
          // app relies on <object>/<embed>, a permissive <base>, or being
          // framed), and are real defense-in-depth alongside
          // X-Frame-Options above.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
