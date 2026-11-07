# SCOTTY Stage A0 — Owner Decisions Needed to Close the Operational Gate

**Status: owner responses outstanding.** This file is a question list, **not** an approval, signature, spending authorization or change request.

## Decision 1 — Staging isolation and spending ceiling (critical path)

Railway's current `SCOTTY / production` and `SCOTTY / Eyes on test` inventories refer to the same Postgres service and volume. `SCOTTY Reliability Staging` has no listed services. We have **not** applied the A0 SQL migration or touched production data.

**Question:** Should we stay strictly at **$0 new monthly spending**, continuing only ephemeral GitHub CI tests, or may we obtain a price quote for an independently isolated staging database and ask for explicit approval of the quoted amount **before** creating anything?

Default without reply: **$0 newly authorized**, no service/database provisioning.

## Decision 2 — Canonical roster and display names

The candidate snapshot contains 185 permanent IDs (25 chiefs, 160 specialists), with no duplicates or missing chief assignments. A few display names appear to be inherited/misaligned (see `docs/a0/display-name-review.md`). The six proposed creative-media profiles remain outside the canonical roster.

**Question:** May the exact canonical IDs and current display names be frozen unchanged as a reviewed version, with all future alias/rename proposals requiring your separate approval? Or would you prefer to review the flagged names before freezing?

Default without reply: candidate snapshot retained, **not signed/frozen**; no alias changes.

## Decision 3 — Render workspace read-only inventory

The connected Render account reported an accessible workspace called **My Workspace**. Render's connector requires the user to choose the workspace before querying services and PostgreSQL resources.

**Question:** Is **My Workspace** the Render workspace authorized for read-only inspection of SCOTTY infrastructure?

Default without reply: do **not** query workspace services or databases.

## Decision 4 — Production backup and restore authorization

Synthetic CI backup/age decryption/isolation tests passed. They **do not** prove recovery of real SCOTTY data. A real encrypted export touches production database contents, possibly restricted client/owner information and separate cost-bearing resources.

**Question:** When infrastructure isolation and a cost estimate are available, may we prepare a **separate exact-scope proposal** for a one-time production **read-only encrypted backup**, with your approval required again before export or any real restore?

Default without reply: no production data access, export, backup job provisioning or real-data restore.

## Decision 5 — Owner control policy and limits

The draft policy says: ask before every new mission, exact per-agent/per-project resource grants, no automatic posts/sends/moves, maximum 24h temporary grant, zero newly authorized spend, private data deny-by-default and no automatic memory promotion.

**Question:** Would you like to adopt these as the final owner-control defaults, while we keep paid-provider calls OFF until you select separate exact per-task and per-day limits?

Default without reply: policy draft only, $0 new usage and all external actions disabled.

## Non-negotiable technical evidence still required

Regardless of answers, Phase A0 must not be marked CERTIFIED until there are: approved owner identity and signed roster; isolated staging and tested grant storage; real executor-side policy enforcement and negative tests; actual cross-service stop-all rehearsal; independently verified real encrypted backup/restore with key custody; data/privacy/rights/retention approval; and budget alerts. Approval to review or quote is not approval to create a billable resource, access private information, export a database, deploy, merge, or enable agents.

**Review flow:** collect the decisions in conversation or a trusted owner interface, record an immutable reference and exact scope separately, then reconcile `docs/a0/certification-evidence.json` only against genuine tool evidence and owner sign-offs. Never mark unfinished gates verified because a checkbox or JSON file was edited.
