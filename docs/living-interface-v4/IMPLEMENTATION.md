# SCOTTY Living Starship Interface — V4 integration track

**Purpose:** turn the approved 64-page V4 master blueprint into SCOTTY's *interface*, not a detached game. This folder is only a contract + synthetic tests. It does not call production agents, Home Assistant, external services, AI APIs, or memory.

## Experience contract

1. **Modes:** Explore (2.5D/3D rooms), Command (instant accessible HUD), Edit (owner-owned visual customization), Holodeck (synthetic demos).
2. **Navigation:** Bridge -> Portal Nexus -> 25 chief suites -> 160 specialist rooms. Always-on 2D directory and fast-travel.
3. **Crew:** import 185 canonical IDs **read-only** (25 chiefs, 160 specialists), without aliases or fabricated IDs. Do not automatically import secrets or memories.
4. **Characters:** animated idle, walk, listen, speak, task queued, work, verified completion, denial and offline states. Animation must reflect verified task state; no fabricated availability.
5. **Objects:** 45 universal interaction templates per room and 45 field-restricted tool slots per room. Universal actions: inspect, pickup, carry, drop, throw, give, store and compatible uses. Restricted objects may be manipulated **only by agents with that field authorization**, never by visitors or mere room membership. Real connected tools have additional backend approval.
6. **Persistence:** positions, holder, room inventory, cosmetic gifts, animation configuration, edit history and revisions stored server-side, with account/tenant boundaries. No unapproved inter-room item transfers; resolve item conflicts deterministically.
7. **Room memories:** personal, department and shared scopes, permission-checked at time of retrieval, never baked into static game assets.
8. **Future physical bridge:** read-only confirmed device events first; later narrowly allowlisted, owner-approved Home Assistant scenes. Security alarms, locks, heaters, ovens and medically important devices disabled in v1.

## Staged milestones

- **M0 contract (this PR):** room/object types, fail-closed gateway, tests and roadmap. No app mounting.
- **M1 visual prototype:** Bridge + Portal Nexus + 2D fallback + one chief room; mock-only crew/status; 1280x800 touch layout, keyboard and caption support.
- **M2 living objects:** 45 universal definitions + 45 engineering definitions, pickup/carry/throw/gift/store, per-room persistence, history, ownership and field authorization.
- **M3 living character:** one optimized avatar with walk/idle/inspect/speak/blocked/error; scene behavior is separate from actual SCOTTY agent jobs.
- **M4 canonical roster adapter:** read-only import with strict 25+160 validation; link room ID to immutable canonical agent ID; no names guessed.
- **M5 authorized agent adapter:** documented capabilities, request IDs, cost preview, owner approval and signed outcome. No direct browser-to-agent credentials.
- **M6 25+160 rooms:** bespoke chief appearance with reusable geometry; 20 specialist archetypes x 8 décor variants. Lazy-load just current room and nearest destination, unload heavy assets.
- **M7 RPG-style interface enhancements:** Council Chamber, Portal Nexus, original soundtrack, cosmetic quests, achievements, archives, relationship graph of verified collaborations, schedules, cooperative simulations, hidden lore, mini-games, room editor, reversible saves.
- **M8 physical Home Assistant:** local gateway, read-only updates, confirmed scenes for Hue/Matter/WLED, Aqara presence and door event projection, voice station connection, emergency stop and logs. Each device is opt-in.
- **M9 owner acceptance:** accessibility, private household view, permissions, backup/restore, replay attacks, refusal and offline behavior, end-to-end test on the BrightLink.

## Required API boundary before M5–M8

Client -> SCOTTY Living Interface backend -> deterministic WORF policy/owner-grant validator -> scoped tool adapter -> authoritative result -> UI state.

**Never** grant execution because an NPC touched equipment, a quest finished, an object is present, a portal is open, an agent self-approved, or the browser sent an approvalId. A stored approvalId is not authorization; the backend verifies principal, scope, resource, operation, expiry and one-use nonce, logs the result, and fails closed.

Events must identify `eventId`, `source`, `verifiedAt`, `entityId`, `state`, `readPermissions`, and `simulation`. Synthetic events cannot be emitted on live channels.

## Acceptance examples

- Travel to GEORDI by name and return to Bridge in <=3 interactions.
- Guest picks up a universal book, places it on a table, reloads scene, and finds it there; a fake object cannot be forged into another account's inventory.
- Guest cannot use restricted engineering scanner; engineering-approved agent can operate **simulated** scanner; security agent cannot.
- Both forged approval and any external action with gateway disconnected are rejected.
- No private department memory appears on a guest kiosk even if the room's door is visible.
- Offline home events become stale warnings; never invent device success.
- 3D error falls back to 2D portal directory, preserving access to the HUD.
- No spending, publishing, production deploy, or new agent ID generation without approval.

## Inputs still needed before live binding

- Verified 185-agent roster export with immutable IDs and field definitions.
- SCOTTY agent API documentation and safe staging endpoint credentials supplied through server-side secrets.
- Actual Home Assistant installation, device inventory and owner-approved allowlist.
- Pinterest design references and appropriately licensed assets.
- A successful BrightLink finger-touch calibration/Windows compatibility test.

## Current limitations

This branch contains **design contracts and synthetic unit tests only**. There is no complete 3D scene, deployed HUD, persistence store, agent bridge or Home Assistant bridge in this PR. Keep it draft until implementation and tests pass.
