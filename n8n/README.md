# SCOTTY + n8n: local free setup and staging bridge

STATUS: Code-only draft on November 6, 2026. NOT deployed, NOT live, AI not enabled. Stacked on the development PR for project/mission biographies. Original Render, Vercel, databases and backups unchanged.

## What this contains
- A separate Cloudflare brain-lab read-only namespace: GET /api/n8n/catalog and POST /api/n8n/plan.
- Read-only 25-chief + 160-specialist development roster (NOT independently verified live), specialties and authored skills.
- Deterministic team routing suggestion for fictional/general prompts only; no AI, memory, project records or actions.
- Two inactive importable n8n workflows in n8n/workflows.
- Local-only, persistent Docker Compose configuration for a Lenovo computer.

## Start n8n for free locally
1. Install Docker Desktop (check its personal-use license) and open it.
2. From the repository root run: docker compose -f n8n/docker-compose.yml up -d
3. Visit http://localhost:5678 on the same Lenovo and set up a local n8n owner account.
4. The port is bound only to 127.0.0.1. HTTP and N8N_SECURE_COOKIE=false are suitable ONLY for local testing. Do not expose the port to your home Wi-Fi, a reverse proxy, internet, or a public domain. Remote use requires HTTPS and security hardening.
5. n8n settings, encrypted credentials and generated encryption material are kept in its persistent named Docker volume. Back it up securely, including the ability to restore credentials. Avoid upgrading blindly; pin a reviewed image version after testing.

## Separate approved staging Worker setup
1. Review the PR, security checks and staging deployment gates. Do not deploy these draft changes automatically or merge them into production.
2. Only after separately approving an existing isolated staging Cloudflare Worker, set SCOTTY_N8N_BRIDGE_ENABLED=true on that Worker. It is false/absent by default.
3. Generate a fresh random 32+ character secret locally. Set it as a protected staging Worker secret named N8N_BRIDGE_TOKEN, different from OWNER_BEARER_TOKEN, backup passwords and database secrets. Never paste any secret into ChatGPT, GitHub, screenshots or public files.
4. Inside n8n create a Generic Header Auth credential with Header Name x-scotty-n8n-token and the staging token as its value. Credentials belong only in n8n's encrypted credential manager, not in exported JSON.
5. Import n8n/workflows/scotty-roster-audit.json and n8n/workflows/scotty-plan-preview.json.
6. In BOTH HTTP Request nodes replace the placeholder staging URL with your actual approved staging Worker URL, and select the Header Auth credential.
7. Leave workflows inactive; execute the roster audit manually first. Expect 185 development roster entries (25 chiefs, 160 specialists) and liveRosterVerified=false. Then manually execute routing with its synthetic, non-private question. Expect missionsStarted=0, inferenceCalls=0 and memoryWrites=0.
8. If BRIDGE_DISABLED, UNAUTHORIZED or another access error appears, stop to inspect configuration. Do not weaken authorization.

## Safety boundaries
- New bridge uses a distinct narrow token; owner bearer is rejected as bridge credential.
- Only discovery and read-only routing; no private data, raw memory, project context, approvals, AI calls, D1 writes, messages, scheduling or external side effects.
- Neither workflow is activated, and neither carries tokens or production URLs.
- No production deployment or paid resources. n8n Community software is free for permitted self-hosted uses, but infrastructure, model APIs and hosting are not guaranteed free.
- Revoke a staging connection by disabling SCOTTY_N8N_BRIDGE_ENABLED and deleting/rotating N8N_BRIDGE_TOKEN. Stop local n8n using docker compose -f n8n/docker-compose.yml stop.
- Owner-controlled execution/assignments, individual memory writes, automated updates and third-party app integrations require separate scoped APIs, audits, permission tests and owner approvals. Do not treat routing suggestions as verified skills or completed missions.

## Test
Run from repo root with Node 22 or newer:
node --test offline-brain/cloudflare-ipad/n8n-bridge.test.mjs

This is synthetic testing only. Live tests would require separate deployment approval.

Official docs:
https://docs.n8n.io/hosting/installation/docker/
https://docs.n8n.io/hosting/community-edition-features/
https://support.n8n.io/article/can-i-use-your-license-for-my-use-case
https://developers.cloudflare.com/workers/configuration/secrets/
