// Augment the wrangler-generated Env with secrets (not emitted by `wrangler types`).
// VISITOR_SALT is set via `wrangler secret put VISITOR_SALT` (prod) and `.dev.vars`
// (local); it salts the visitor IP hash. Optional so dev/tests work without it.
interface Env {
  VISITOR_SALT?: string
}
