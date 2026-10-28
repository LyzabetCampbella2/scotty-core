# SCOTTY HUD Team Brain — chat, voice and memory acceptance

Status: staging implementation in draft PR #40. **No production deployment or live owner-authenticated acceptance has been performed by this PR.** GitHub tests use synthetic Worker responses and an in-memory D1 substitute; they do not prove the iPad microphone, TTS worker or live D1 binding.

## Intended flow

1. Existing native HUD commands remain on their native command or application routes.
2. Explicit collaborative/team requests typed into HUD chat or recognized after “Scotty” use the same client-side Team Brain router.
3. A separate one-time approval appears before any request is transmitted to Cloudflare. Owner must approve this mission, Cloudflare processing and absence of private/client/production data. The owner may click all three checks and Send or speak the explicit approval phrase while playback is silent; captured playback transcripts cannot approve. Cancellation sends nothing.
4. An approved question is sent to the existing owner-authenticated Render proxy POST /api/independent-brain/team, which forwards it to the isolated Cloudflare Worker. The Worker runs specialist → chief → SCOTTY. No browser Worker token and no silent fallback to Groq are permitted. Each mission carries a unique ID.
5. The result is displayed in HUD chat and sent through its existing Scottish speech function. GET /api/independent-brain/missions independently checks the saved D1 checkpoint (same ID, status and answer). A result is labeled verified **only** when the independent read-back succeeds.
6. Generated output is not automatically treated as factual long-term knowledge. For a separate, owner-reviewed SCOTTY-only note, edit the displayed note, approve its content and privacy, click Save reviewed memory, then independently verify the note ID through GET /api/independent-brain/memory?agentId=scotty.

## Required live acceptance on a non-production staging instance

Prerequisites: staging owner authentication, Cloudflare Workers Free verified, AI and dedicated BRAIN_DB readiness confirmed, dedicated D1 schema initialized, Render proxy flags enabled **for staging only**, and an owner-controlled iPad with functioning microphone and Scottish TTS worker. Do not enter private files, manuscripts, API tokens or credentials into the lab.

- **Chat:** Submit “Ask your agents to review a fictional three-step software checklist with expected results.” Confirm zero Worker calls before approval; approve once. Verify a specific SCOTTY answer appears in HUD text and hear the same answer spoken. Record mission ID.
- **Persisted D1 mission:** Use the authenticated Saved missions view and inspect the same ID, completed status and answer. Do not mistake a successful POST for verified persistence.
- **Reviewed knowledge:** Review/edit a short synthetic answer, explicitly approve the SCOTTY-only scope and no-private-data statement, save, and read the SCOTTY agent memory back. Do not claim knowledge was saved when the separate memory GET fails.
- **Voice:** Say “Scotty, ask your agents to review a fictional three-step software checklist with expected results.” Then speak “Scotty, approve this team brain request no private data” after speech playback stops. Verify the same response, independent D1 read-back and no manual Send press. Record recognition and audio reliability on the iPad.
- **Safety regressions:** Cancel or say Stop before approval; replay an approval transcript marked capturedDuringSpeech; interrupt during a slow request; submit an over-500-character explicit team request; confirm no Worker transmission or unsafe Groq fallback. Normal native folder/task/eyes commands must continue to use their existing routes. A Worker unavailable/AI-disabled error must be visible and must not silently run an alternative provider.
- **Final status:** Mark live acceptance **PASS** only if both voice and typed answer, D1 mission GET and optional reviewed knowledge POST+GET actually succeed under owner authentication. Otherwise record exact failed step, timestamps and HTTP statuses without secrets.

## CI validation

Run `node --test src/brain/independent-bridge.test.mjs src/agents/brain-roster-sync.test.mjs tests/team-brain-hud-routing.test.mjs` with synthetic inputs and no service credentials, followed by Bun server bundle. No paid services or production databases are needed. Do not merge/deploy this draft merely because mock tests pass.
