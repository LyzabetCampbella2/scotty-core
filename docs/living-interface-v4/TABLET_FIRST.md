# SCOTTY Living Interface — tablet-first continuation

## Target: existing Floot apps, not a duplicate product

Existing projects discovered on 2026-11-10:
- Floot **S.C.O.T.T.Y.** (older published HUD): project `10f6ffc0-f4e5-4971-9b91-1f8747804ebe`, live URL https://scotty-on-deck.floot.app.
- Floot **SCOTTY Starship — 3D Interface for Core**: project `bcdea6f4-ab4d-407b-a6c8-81f4bef4b9f9` (preview only).
- Floot **SCOTTY Living Starship — Immersive Interface**: project `e69b0c96-ec3b-44a2-8e70-adb295235971` (preview only).

**Do not create another duplicate app.** Once Floot actions are available, inspect source of the 3D Interface for Core and the original S.C.O.T.T.Y. HUD, compare pages, and implement on the appropriate existing project after preserving all old capabilities.

## Tablet usability contract

- iPad Safari / Android Chrome; no local coding software needed.
- Landscape 1024x768 baseline and portrait 768x1024 baseline, responsive down to 390px.
- Touch targets >=44px and large typography for projector's 1280x800 native resolution.
- Two modes: **Command** (instant access to real SCOTTY tools) and **Explore** (animated RPG-inspired rooms). Switching is always one tap.
- Persistent tabs: Bridge / Portal Nexus / Agents / Missions / Home / Approvals / Settings; more inside a drawer.
- Tablet controls: virtual joystick / tap-to-move; tap object to inspect; contextual buttons to pickup/place/gift. No hover-only interactions.
- Agent rooms: 25 chief suites + 160 specialist slots from canonical IDs. Use modular lazy loading and a non-3D 2D directory fallback.
- Retain old HUD functionality before any UI replacement. Create a feature inventory comparing navigation, chat, agent browser, mission/task queue, owner approvals, voice, notifications, memories, system status, integrations.
- Live status sourced from verified backend only; unconnected features show Demo or Not Connected.
- User's original 45 universal and 45 professional object requirements; field-only handling for job-specific tools; real external operations require separate owner grant.
- Room editor: owner-only palette, furniture layouts, portal sign, scene export/import with undo; never edits canonical IDs or backend access policy.
- Character visuals are part of the avatar layer and should not imply actual work is happening.
- Support text alternatives, reduce motion, captions, large text, mute, keyboard input, and public/kiosk guest mode.
- For home devices, fail closed until staging gateway, explicit allowlist and owner approval verified. Never expose tokens in browser.

## Next development sequence

1. Read the old published HUD and 3D project's actual routes, components and API contracts through Floot.
2. Create a checkpoint before editing, and preserve unrelated project code/data.
3. Add tablet-first navigation and 2D Portal Directory to existing 3D project.
4. Integrate existing chat/missions/agent read-only features with their real authenticated backend; do not invent endpoint schemas.
5. Add touch-friendly 2.5D Bridge + one chief room, mock-only interactions initially.
6. Test via tablet/portrait/landscape and verify existing HUD features still work.
7. Only after user-led acceptance, integrate the security-checked SCOTTY gateway.

## Status

This is a requirements document only. Floot account hit a metered daily build-action limit before source inspection/editing was possible in this session. No claim of deployed functionality is made.
