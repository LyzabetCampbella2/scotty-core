# SCOTTY Stage B / Phase 1 — Individual Review and Safe Evidence Procedures

**Status:** Offline preparation only. All 185 agents remain unapproved, untested as live models and disabled. Stage A0 operational certification remains blocked. This guide is not a permission grant or deployment instruction.

## Scope and dependencies

The owner approved the 185 permanent agent identities and current names. Future aliases require separate review. SCOTTY's overseer remains separate. The branch inherits A0's frozen roster (25 chiefs, 160 specialists) and creates no new resources. Current owner constraints: **$0 new infrastructure spending** and **separate approval before production-data access or export**.

Existing assets: 185 owner review packets; 1,480 unchecked evidence items; 25 chief and 160 specialist personality proposals; 185 knowledge dossiers with 555 outstanding requirements and 740 source-review questions; 555 unrun planned evaluations with 2,220 rubric criteria. Eight chiefs have historic sourced proposals, including a legacy TROI ID conflict.

## 1. Individual personality review queue

Run:

~~~bash
node scripts/phase1-export-review-workflows.mjs queue > /tmp/scotty-b1-review-queue.json
~~~

This exports 185 worksheets grouped into 25 departments, each chief first. Each worksheet asks for temperament, tone/humor/check-in rules, reasoning and failure modes, knowledge sources, collaboration/handoffs, and preservation of approved identity. A draft queue transition may request a revision or mark a packet prepared for *future* external owner review. It requires the exact agent ID and previous revision hash. Prepared is **never** approved; no questions are automatically answered or traits independently verified.

## 2. Illustrated evaluations and chief-specialist comparisons

~~~bash
node scripts/phase1-export-review-workflows.mjs examples > /tmp/scotty-b1-examples.json
~~~

This export has **555 ILLUSTRATIVE OFFLINE EXAMPLE responses**, one for each agent and test type (shared, specialty, adversarial), and 160 paired chief-specialist comparison worksheets with no scores. Each example remains LOCAL_SYNTHETIC_FIXTURE, modelExecutionStatus=NOT_RUN and evaluationVerdict=NOT_GRADED. These are model-free editorial examples, **not real agent responses**.

Future live evaluation requires a separately approved model budget and operating scope, actual model/version/time/output receipts, an independent reviewer, all four scored evidence criteria and repeated adversarial tests after edits. A local example cannot count as a passing real-model test.

## 3. Knowledge-source verification intake

The source-review code accepts only metadata: exact agent/knowledge-requirement ID, claimed category, title, publisher, publication date, claim to verify, and either safe public HTTPS URL or separately consented restricted record reference. It never fetches sources. It rejects embedded URL credentials, localhost/private-network targets, unexpected fields or attempts to mark a source as verified. Source metadata is untrusted and might be wrong.

An independent reviewer must later confirm actual source contents, author/publisher, dates, claim support, contradictory evidence, licensing, consent and recency. Source checks completed: **zero**. No production-data access is authorized.

## 4. Versioned personality drafts

The review journal stores one unapproved baseline per agent and hash-linked proposed edits. The editable field allowlist excludes owner approval, accepted traits, identity, production access, memory writes, budgets and activation. Hashes detect accidental changes but **do not prove who owns a version**; someone who can replace a complete chain can create fresh hashes.

~~~bash
node scripts/phase1-export-revisions.mjs > /tmp/scotty-b1-baseline-revisions.json
~~~

## 5. Rollback and authenticated owner review design

The offline rollback planner can identify an earlier valid draft and produce a non-executable plan containing its exact source hash, selected destination hash, and reason. It cannot change a live service or revoke a completed external action.

Before any future owner approval is executable, a separate trusted integration must provide:
1. Independently authenticated owner session and exact per-agent/per-version approval receipt in protected append-only storage.
2. Exact agent/project/task/resource/action/revision/account/channel checks at **real** executor/provider boundaries, budget caps, idempotency and revocation.
3. Real stop-all propagation, evidence-backed rollback/deactivation, audit receipts and cross-project denial tests.
4. Independently verified source knowledge and three actual model evaluations per agent with reviewer evidence.
5. Stage A0 staging isolation, real multi-service emergency stop, independently verified encrypted restore and explicit owner acceptance.

**The current GitHub branch does not include this real approval service.** Chat instructions, Git commits and edited JSON are not substitutes for authenticated runtime authorization.

## Readiness

| Scope | Built in draft | Missing for certification |
|---|---|---|
| Identity | 185 locked IDs and names | Live executor identity integration |
| Personality | 185 reviewable proposed concepts | 185 owner-reviewed accepted versions |
| Tests | 555 prompts, 555 illustrative responses | Real-model runs and independent scoring |
| Knowledge | 555 source requirements and metadata intake | Independent claim/source verification |
| Review | Chief-first queue, proposed revisions, rollback plans | Trusted owner approval/audit system |
| Production | None deployed from this PR | A0 isolation, real emergency stop and restore |

**Verdict:** Stage B1 offline engineering progresses, but no agent is independently certified or activated. $0 new infrastructure and no production-data access remain in force.
