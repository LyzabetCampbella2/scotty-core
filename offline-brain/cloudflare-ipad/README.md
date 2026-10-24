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
