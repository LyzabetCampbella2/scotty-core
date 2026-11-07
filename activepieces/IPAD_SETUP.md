# SCOTTY + Activepieces Cloud — iPad setup

**Status November 6, 2026: source draft only; NOT a live connection.** This branch has a disabled, read-only Cloudflare staging bridge. No Activepieces account/workspace has been accessed or created, no Cloudflare deployment happened, no production SCOTTY code was changed and no secrets were saved.

## Why Activepieces
- Activepieces Cloud Free: currently 100 credits per day, no card, Flows, Agents, Tables, API access; higher-cost AI actions use additional credits. Verify at https://www.activepieces.com/pricing before entering billing information.
- Runs in the cloud, accessible from iPad Safari; editor may need Request Desktop Website or a keyboard/trackpad.
- This does NOT automatically deploy 185 working autonomous agents. The repository stores authored development profiles for 25 chiefs and 160 specialists, but they are not individually verified/executing Activepieces agents.
- Keep SCOTTY's reasoning, character profiles, project ACLs, approvals and long-term memory in its controlled application; Activepieces is just the automation and integration layer.

## First actions on iPad — no computer required

1. In Safari go to https://cloud.activepieces.com/sign-up and create a **Free** cloud account yourself.
2. Create a folder/project for "SCOTTY — Staging". Do not connect production accounts or import private projects.
3. In Flows, create an empty flow **SCOTTY — Catalog check (manual)**. Select a manual trigger if available in your current editor or use the built-in test/run control. Add an HTTP / Send HTTP Request action.
4. When a separate staging Cloudflare Worker exists (see security gate below), set method GET and URL https://YOUR-ISOLATED-WORKER.workers.dev/api/activepieces/catalog. Add header x-scotty-activepieces-token from the separately provisioned staging secret using Activepieces' secured connection mechanism or secret field; never put it in exported flow JSON or printed logs. Test with the synthetic development roster only.
5. Create a second flow **SCOTTY — Team suggestion (manual)** with HTTP POST to https://YOUR-ISOLATED-WORKER.workers.dev/api/activepieces/plan and Content-Type: application/json. For the body, use this fictional-only payload:
   {"question":"Plan an entirely fictional software QA checklist for a toy app."}
   The response should be PROPOSAL_ONLY with aiCalls=0, memoryReads=0, memoryWrites=0 and missionsStarted=0.
6. Leave BOTH flows disabled/unpublished for automatic running until a separate deployment, API identity and permission review has succeeded. Only manual tests are contemplated.
7. Expected catalog response: 185 development agents, chiefs=25, specialists=160, liveRosterVerified=false. This is a source roster, not a verified production registry.

## Security gate (required BEFORE the HTTP steps can actually work)

- The owner must separately review and authorize an isolated Cloudflare staging Worker deployment based on the development branch. This draft has not deployed anything.
- The staging Worker must have SCOTTY_ACTIVEPIECES_ENABLED=true to enable the bridge (absent/off otherwise).
- Generate a fresh high-entropy 32+ character secret using a password manager on your device; install only via the Cloudflare secret manager as ACTIVEPIECES_BRIDGE_TOKEN. Keep distinct from OWNER_BEARER_TOKEN, the SCOTTY recovery passphrase, n8n token and database credentials.
- Set the matching value in a protected Activepieces connection/secret used for header x-scotty-activepieces-token. Never share it in ChatGPT, GitHub, screenshots, URLs, flow exports, browser notes or logs.
- API only supports authenticated GET catalog and POST inert plan. No projectContext, memory data, arbitrary approval fields or external execution.
- No paid resources, model inference, private documents, personal files, production SCOTTY data, GitHub writes, n8n migration, or deployment are included in this branch.
- When finished, disable SCOTTY_ACTIVEPIECES_ENABLED in isolated staging and rotate/remove the secret.

## Growth plan after staging
1. Add SCOTTY master agent with human review of assignment requests.
2. Add chief prompts and specialized methods; n8n-to-Activepieces conversion is not a JSON import, each platform has different flow formats.
3. Add an explicit mission job API to SCOTTY with durable project identity, approvals, idempotency keys and audited execution. Do not send a text prompt to the read-only plan API and treat it as authorized execution.
4. Add permission-enforced, scoped memory service (individual/department/shared), independent backups and a source approval pipeline.
5. Connect optional GitHub/Calendar/Gmail automations with minimal permissions, and review email-sending or repository-changing actions before enabling.

## Resources
Activepieces pricing: https://www.activepieces.com/pricing
Cloud signup: https://cloud.activepieces.com/sign-up
HTTP piece: https://www.activepieces.com/pieces/http
AI actions: https://www.activepieces.com/pieces/ai

## Verify source
Run with Node 22+: node --test offline-brain/cloudflare-ipad/activepieces-bridge.test.mjs

**Not yet:** deployed endpoints, authenticated workspace, working flows, AI agents running independently, paid resources or production changes.
