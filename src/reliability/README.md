# Reliability & Control (isolated implementation)
This is a safe foundation on a feature branch, NOT wired into the production HUD.

Includes service health reporting, emergency-stop gating, exponential retry delays, action approvals, and in-process idempotency.

Before production: add durable persistence for approvals and idempotency, authenticated owner-only approval and stop endpoints, scoped provider permissions, audit logs with redaction, backup/restore verification, rate limits, and UI integration. Do not retry non-idempotent provider actions without provider-side idempotency. Do not treat in-memory state as durable or cross-instance.

Acceptance tests: emergency stop rejects actions; sensitive/write actions reject without unexpired approval; same action ID does not execute twice within one process; service health can recover; failures back off. Validate voice and Eyes On independently before merge.