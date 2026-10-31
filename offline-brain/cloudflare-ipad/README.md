# S.C.O.T.T.Y. — iPad-controlled independent Cloudflare Brain Lab (Phase 5)

**STATUS: DRAFT CODE, UNDEPLOYED, AI DISABLED, SYNTHETIC AGENT PROFILES.**

This is a standalone Cloudflare Worker research prototype layered on draft PR #22 (128 specialists), #23 (public source discovery), #24 (private local knowledge), and #25 (local inference). It resides under offline-brain/cloudflare-ipad/. The existing SCOTTY Core router, production Render database, original HUD, voice, Groq settings, and encrypted .age backups are untouched.

## From iPad, without Lenovo

Manage GitHub, a future separate Cloudflare Worker, and an owner-authenticated web interface using iPad Safari. Language-model inference runs on Cloudflare servers: this is NOT offline or on-device generation, and does not require Groq or Grok. The prototype does not train a foundation model; field expertise would come from curated, owner-reviewed retrieval sources.

**Cloudflare sources (verified 2026-10-24):**
- Workers AI Free allocation: 10,000 neurons/day, reset 00:00 UTC. Workers Free requests above that fail instead of incurring AI inference charges. Paid Workers accounts MAY incur charges above free quota.
  https://developers.cloudflare.com/workers-ai/platform/pricing/
- Workers Free: 100,000 Worker requests/day.
  https://developers.cloudflare.com/workers/platform/limits/
- Workers AI binding (AI), supported env.AI.run API.
  https://developers.cloudflare.com/workers-ai/configuration/bindings/
- Model: @cf/meta/llama-3.2-3b-instruct.
  https://developers.cloudflare.com/workers-ai/models/llama-3.2-3b-instruct/

## Implemented

- Mobile Safari-friendly standalone SCOTTY Independent Brain Lab, separate from original HUD.
- Fail-closed API. OWNER_BEARER_TOKEN must be a private 32+ character secret set through Cloudflare's secret management when/if deployed; otherwise requests fail. Do not commit secrets to GitHub.
- The browser retains its secret only in that tab's running JavaScript memory: it is not saved to cookies, localStorage or URLs.
- 128 synthetic agent profiles, 12 chiefs, methodology packs and team recommendations inherited from Phase 1. These are synthetic fallback-aligned identities, not imported real production agents.
- Candidate public source manifest inherited from Phase 2. No live refresh or auto-verification is running from the Worker.
- AI_ENABLED is FALSE by default. One explicitly owner-approved question can reach Workers AI only if the owner confirms it contains no private information AND agrees Cloudflare will process the question AND enables AI in a separately authorized isolated staging Worker.
- 500-character input cap; 160-token output cap; one model call maximum per approved request; no automatic retries, cloud fallback to Groq, or tools/actions.
- AI answers are labelled UNVERIFIED_CLOUDFLARE_METHOD_DEMO and contain method guidance only, not facts verified by a knowledge base. Failed/unavailable requests fail closed.
- No new R2, KV, D1, paid Render database, private client folder, GitHub production secrets or ANSJEM integrations.
- Node synthetic tests and Wrangler deploy --dry-run compilation are configured to run with no Cloudflare account token or usage.

## Security and truthfulness

This is a **single-owner prototype**, not a production multi-user authorization system. A bearer token confers access. Protect it in a password manager and NEVER paste it into GitHub, issues, ChatGPT messages, or screenshots. The Worker should be accessed only over HTTPS. It does not persist the token across page refresh.

Consent flags are owner confirmations, not automatic checks for sensitive content. Do NOT enter private memories, client manuscripts, financial/health data, passwords, keys or proprietary production documents. Cloudflare processes the prompt whenever the owner allows AI. Review Cloudflare data-use terms before moving beyond synthetic questions.

The 140 seeded guides are methodological instructions, NOT comprehensive fact-checked domain knowledge. No owner-curated private storage is attached to this Worker. The on-disk private Phase 3 local store is intentionally NOT connected; Workers are stateless, so future private storage requires separate approval and security review.

Cloudflare Free plan quotas control usage, but this prototype cannot read the real account's remaining AI neurons or guarantee zero spending if placed on a Workers PAID plan. Before enabling AI, verify the account is on Workers Free. No prepaid credits, no paid AI Gateway, and no upgrade are authorized.

The four existing brain PRs are stacked drafts. Do not merge them into scotty-core main or deploy these changes to live Render/Vercel without a separate reviewed staging plan. A standalone staging Worker must be deployed separately, not routed to the live SCOTTY Core domain.

## iPad steps AFTER code review and separate deployment approval

1. Review the draft PR in Safari; confirm synthetic CI tests pass and source contains no credentials or private data.
2. In the Cloudflare dashboard, confirm the actual account is on the Workers FREE plan. Verify the Workers AI daily quota in the dashboard.
3. Prepare a separate staging Worker project named scotty-independent-ipad-brain-lab. Deploy ONLY offline-brain/cloudflare-ipad/ with its wrangler.jsonc, from an isolated source/deployment workflow, NOT the root production SCOTTY service.
4. Create a distinct cryptographically random owner token with at least 32 characters using your password manager. Add it as Cloudflare secret OWNER_BEARER_TOKEN. Never reuse SCOTTY's recovery key or a database URL. No token belongs in source or public environment variables.
5. Leave AI_ENABLED=false initially. Open the new standalone lab URL in iPad Safari. Unlock with the secret and verify catalog, 128 agent profiles, 12 chiefs, source manifests, and offline assignment plans. These do not call Workers AI.
6. After review, optionally approve changing the isolated Worker ONLY to AI_ENABLED=true. Send ONE synthetic question after affirming all three consent controls. Watch actual Workers AI neuron usage and verify there are no extra external connections.
7. If Cloudflare asks for an upgrade, billing method, prepaid credits or paid resources, STOP. Do not proceed.
8. Before ingesting private documents or integrating with live SCOTTY, separately approve a permissioned private source store, actual owner login, project-level ACL checks, independent restoration tests and spending controls.

## Testing in GitHub Actions

Run:
    node --test offline-brain/cloudflare-ipad/worker.test.mjs

And compile without deployment:
    npx wrangler@4 deploy --dry-run --config offline-brain/cloudflare-ipad/wrangler.jsonc

No GitHub Actions step publishes code, installs production credentials, calls real Workers AI, creates a paid database, or modifies an existing service.

## Updating knowledge and recovery

- The Phase 2 public RSS/Atom source updater is only a draft; an actual scheduled source refresh is NOT live.
- After separately reviewed promotion, verified source references can be associated with designated agent specialists. Automated headlines alone do not constitute authoritative or continually learned knowledge.
- Keep the October 18 independently restore-verified encrypted .age backup and the October 24 downloaded checksum-matched .age backup in secure owner storage. The October 24 export still needs isolated restore verification.
- Do not import database backups or private key files into this Worker or public repository.
- Render free production memory was previously documented to expire November 7, 2026; verify the actual date and preserve recoverability independently from this experiment.

## Explicit unfinished gates

- Source-only completed; CI and Wrangler dry-run need review.
- No real Cloudflare deployment or live model calls.
- No auto-updating knowledge store.
- No real SCOTTY production agent identity synchronization.
- No original HUD integration or speech/voice.
- No private document upload, storage or source verification pipeline.
- No paid services or account modifications.

**Keep this as a draft; do not merge or deploy until separately authorized.**

## October 30 staging extension — priorities 6–12

The earlier 128-agent/12-chief single-specialist description above documents the initial Phase 5 prototype. Current **draft source on this branch** proposes **25 chiefs + 160 specialists** and SCOTTY oversight. The 160 playbooks are authored methods and explicitly **not** separately fact-validated expertise. Production source, paid infrastructure and private account data remain untouched.

- Worker agent selection chooses one or two departments, then specialist → responsible chief → SCOTTY (up to five AI calls on the separate lab, only after opt-in and AI activation).
- D1 memory is scoped to individual, department, or shared notes with explicit reviewed attribution. Optional governance migration adds owner-previewed correction/expiry/archive/deletion and a redacted audit. The D1 migration has **not** been applied by these commits.
- D1 team missions store checkpoints; replay is keyed to project and exact approved source hashes where supplied. Every completion response independently reads back the mission ID and results. An acknowledged write alone is insufficient.
- Owner-only `GET /api/operations` reads checkpoint counts, up to 20 stale mission samples, the **total** stale mission count, and the number requiring owner attention. Real provider quota and historical provider usage remain unknown and are never inferred.
- Owner-only `POST /api/mission-recovery` with `stage=preview` can read the exact timestamp of a checkpoint stuck in `running` for over 10 minutes. A separate `stage=apply` requires that timestamp, `ownerApproved:true`, and `reviewAcknowledged:true`. Its database update is conditional on the unchanged checkpoint and running state; it marks the mission incomplete while preserving prior stage text, **never** starting AI or retrying. Delayed model calls cannot overwrite a closed mission. An actively finishing worker may still be in flight: investigate before marking it incomplete.
- The companion original-HUD preview/confirmation controls are staged in Render PR #54 behind `SCOTTY_INDEPENDENT_BRAIN_RECOVERY_ENABLED=true`. The flag is **off by default**. Neither PR deploys or triggers a D1 recovery.
- Failure modes tested with synthetic SQLite: no consent, mismatched revision/time, no D1 binding, concurrent updates, delayed AI, idempotence, and preserved partial work.

**Deployment order:** verify a recent full PostgreSQL backup and independent restore; then independently review and deploy the Cloudflare Worker with its D1 migration as appropriate; test authenticated readback and Free-tier quota; only then review the Render HUD proxy and turn on a narrowly scoped recovery flag. Never enable an autonomous retry or production export as part of these steps.

## Owner-reviewed recovery audit migration (new isolated D1 capability, October 30)

Recovery changes are **blocked by default** until the dedicated D1 database has the separate, additive `mission-recovery-v1.sql` table. The Worker now treats that schema plus D1 transactional batch support as mandatory for any owner-confirmed stale-mission closure; status and preview report audit migration readiness. A missing migration produces a blocked preview with no apply control.

- **No live migration has been executed.** First confirm Workers Free plan and which dedicated D1 instance is bound to the isolated lab. Complete approved D1 backup / export readiness before applying any new SQL. Do not apply to Render PostgreSQL or an unrelated D1 database.
- Review `offline-brain/cloudflare-ipad/mission-recovery-v1.sql` and its redacted columns: random event ID, mission ID, transition, previous checkpoint time, closure timestamp, stage count, and owner-authenticated actor category. No question text, agent findings, documents, passwords, R2 keys, or bearer tokens are saved in this audit.
- After a separately approved staging D1 migration, verify `GET /api/status` reports `recoveryAuditMigrationReady:true`. The owner-only `GET /api/mission-incidents` can then return up to 20 redacted events (optionally filter by exact `missionId`). This is a *history of confirmed recovery actions*, not proof that a model's answer is factually correct.
- A checked owner must preview a stale (>10 minutes) mission, investigate whether it is still running, and explicitly approve the exact timestamp in the original HUD. Render's server-to-server proxy additionally requires the separately enabled `SCOTTY_INDEPENDENT_BRAIN_RECOVERY_ENABLED=true`, owner session, exact same-origin POST and CSRF marker. No authenticated endpoint exists publicly without the Worker secret.
- D1 applies the status change and redacted event insertion in **one transaction**, compares the checkpoint timestamp, and independently reads back the exact resulting mission and audit ID. If logging, migration, conditional update or readback fails, **no successful recovery is claimed**. Existing stage findings are kept; no uncertain model calls are retried or automatically sent to another provider.
- Test evidence: `operations-recovery.test.mjs` loads the **actual migration SQL** into synthetic SQLite, verifies atomic rollback when a synthetic audit trigger fails, status races, permission checks, late model writes, and redacted read-only incident history. Synthetic CI alone is not live D1 acceptance or iPad approval.

This capability does not address the separate November 7, 2026 Render Free PostgreSQL expiry. Preserve a newer independently restore-verified encrypted backup **before** executing any production-affecting release.
