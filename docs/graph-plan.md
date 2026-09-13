# Persistent feature graph and incremental audits

## Scope
Store observed application behavior in the project database and expose an interactive dashboard canvas. No ideal graph or feature suggestions. The connected coding agent reads its repository; the remote server never claims to inspect local files.

## Implementation
1. Project-scoped nodes and directed edges with stable keys and source evidence. A versioned discovery checkpoint persists the frontier and inspected revision. Bound batches and project sizes.
2. Bounded graph journeys reuse existing flows by ID or create one once. Path changes invalidate prior coverage. Discovery uses optimistic concurrency so concurrent batches cannot overwrite checkpoints.
3. Claim the next pending/stale journey using a project-wide expiring lease. Return a run and its steps. Require current lease ownership for evidence and completion. Recover abandoned runs; preserve failed results without repeatedly auditing unchanged paths.
4. A dashboard graph canvas supports pan, zoom, grouped exploration, journey highlighting, status filtering, and evidence/issue links. Load bounded graph sections, not an entire large graph.
5. Update MCP playbook and generated scheduling instructions. Test authorization, deduplication, checkpoint conflicts, invalid paths, claim exclusion, expiry, and accurate completion. Run lint and production build.

## Storage and limitations
Initial limits: 5,000 nodes, 10,000 edges, 2,000 journeys per project; 100 nodes/200 edges/50 journeys per batch. Source references are bounded text, never source-file copies or credentials. Retain the latest 20 issue-free completed runs per graph journey; runs with issues remain for human review/history. Existing manual flows remain supported. Discovery completeness is an agent-reported checkpoint, not proof that every application state has been found. Source inspection is explicitly separate from browser testing.
