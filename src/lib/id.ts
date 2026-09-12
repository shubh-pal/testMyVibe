import { randomBytes } from "node:crypto";

// A URL-safe random token, used for regenerating a project's MCP auth token.
export function createId(): string {
  return randomBytes(24).toString("base64url");
}
