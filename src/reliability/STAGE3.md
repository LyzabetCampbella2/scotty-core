# Stage 3 — recovery, watchdog and audit
- Audit events contain only allowlisted metadata; never arbitrary provider payloads or personal text.
- Optional SCOTTY_AUDIT_PATH persists append-only JSONL on a writable volume. It is not an immutable audit store.
- Watchdog detects stale operations and marks their service degraded. It does not forcibly abort an operation or restart services.
- SnapshotStore validates JSON snapshots and uses temp-file rename for single-host atomic replacement. Requires a mounted persistent volume to survive redeploys; not wired to memory or project storage. Does not constitute a production backup.
- Voice and memory compatibility adapters currently return 501; do not mark them operational based on configuration flags.
- Stage 3 still requires durable shared persistence, encryption, authenticated owner UI, agent executor wiring, provider idempotency, and recovery drills before production deployment.
