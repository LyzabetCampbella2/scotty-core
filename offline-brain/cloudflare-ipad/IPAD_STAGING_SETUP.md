# SCOTTY — iPad Cloudflare Staging: Owner Setup Checklist

**Status: staging preparation only. No Worker has been deployed.**

## 1. Verify free plan

On your iPad, open https://dash.cloudflare.com/ and confirm the actual account is on **Workers Free**. Do not upgrade or enable paid AI add-ons.

Keep all SCOTTY private data, encryption keys, production DATABASE_URL, client files and October 18/24 backup archives outside this experiment.

## 2. Create a NEW dedicated Worker using GitHub

Official setup: https://developers.cloudflare.com/workers/ci-cd/builds/

- Workers & Pages -> Create application -> GitHub. Choose LyzabetCampbella2/scotty-core.
- New isolated Worker name EXACTLY: scotty-independent-ipad-brain-lab
- Source branch EXACTLY: dev/ipad-cloudflare-staging-gates-20261024
- Root directory EXACTLY: offline-brain/cloudflare-ipad
- Build command:

    node staging-preflight.mjs && node --test worker.test.mjs staging-preflight.test.mjs

- Deploy command:

    npx wrangler@4 deploy --config wrangler.jsonc

**WARNING: The deploy command does publish the Worker whenever Cloudflare Builds reaches it. The preflight intentionally fails until you confirm Workers Free and the correct branch.** Cloudflare may initially default to main. Go to Worker Settings -> Builds -> Branch control to ensure the production branch is the dedicated staging branch above, never main.

Leave Preview builds disabled, custom domains unconfigured, external paid bindings empty and production routes empty. The workers.dev subdomain is sufficient.

## 3. Set the build-time free-plan attestation

After YOU manually confirm Workers Free, open this NEW Worker's Settings -> Builds -> Environment variables. Add this BUILD-TIME variable:

    SCOTTY_STAGING_FREE_CONFIRMED = YES_CONFIRMED_WORKERS_FREE

The Node preflight verifies this value AND Cloudflare's automatic WORKERS_CI_BRANCH variable equals the staging branch. It does NOT inspect billing accounts automatically. A failing initial build prior to this confirmation is expected and safe. Rerun/build again after setting the build variable. Check that the new Worker name, branch and root are all correct before proceeding.

## 4. Secret owner authentication (not source code)

In your password manager, generate a unique 32+ character random token. Do not reuse your encrypted-recovery key, passwords or Groq credentials.

In the NEW Worker ONLY, Settings -> Variables and Secrets -> Add -> Secret:
- Name: OWNER_BEARER_TOKEN
- Value: your random password-manager-generated owner token (NEVER send it to ChatGPT, GitHub, logs or public issues)

Save it in your password manager. Deploy the secret change if Cloudflare prompts you. Keep AI_ENABLED=false. The visible login page is public, but all owner API endpoints must reject requests without the secret.

## 5. Safe iPad smoke test

Open the new isolated workers.dev URL in iPad Safari. Use your owner token to unlock.

- /health reports STAGED_INDEPENDENT_LAB
- /api/status reports 128 synthetic profiles, 12 chiefs, aiEnabled:false, renderMemoryConnected:false, groqConnected:false
- Choose Recommend Agents to get a plan with aiCalls:0
- View approved publishers; this is a candidate source manifest, NOT active public knowledge updates
- AI should remain unavailable and /api/ask should refuse while AI_ENABLED=false

Do not enter any client manuscripts, private files, real personal data, passwords, production database archives or keys. Do not merge PRs #22–#27 into production. Do not activate Cloudflare AI until another explicit owner authorization.

## 6. Safety limitations and spending

Cloudflare Workers Free AI allowance currently provides 10,000 neurons/day; over quota, further requests fail. A Paid account may incur charges above that quota: https://developers.cloudflare.com/workers-ai/platform/pricing/

Cloudflare Git integration normally deploys every push to the chosen production branch. This staging Worker MUST use the distinct name, branch and root directory above. The preflight does not authorize any production action and cannot tell if your Cloudflare plan actually changed.

All 128 agent profiles are synthetic development mappings, the methods are not fully researched field knowledge, and no actual live knowledge updating, long-term memory, production agents, voice, original HUD, Dawna bridge, real-model answer tests, or private knowledge store is connected.

Meta model terms may require acceptance. Do not agree to a paid upgrade.

A passing GitHub test/Cloudflare build does not guarantee secure multi-user operation. This lab is single-owner research-only and uses bearer-token authentication.

## 7. Developer tests (GitHub only; no real Cloudflare API)

    node --test offline-brain/cloudflare-ipad/staging-preflight.test.mjs
    node offline-brain/cloudflare-ipad/staging-preflight.mjs
    npx wrangler@4 deploy --dry-run --config offline-brain/cloudflare-ipad/wrangler.jsonc

These tests do not deploy, create storage, connect Render or spend neurons.
