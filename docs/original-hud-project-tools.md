# Original HUD project tools integration

Development-only review candidate. No merge, production deployment, account connection, feature activation, database or credential change is authorized by this work.

- Existing agent matrix, Scottish voice, gesture controls and telemetry remain in the original HUD; no edits to public/index.html or voice/gesture code.
- Project teams & briefing opens inside the central workspace, preserving the surrounding navigation, telemetry and conversation area. Closing restores the matrix and returns keyboard focus. Standalone fixtures without the main workspace retain a bounded fallback drawer.
- Project panels now use the original navy, cyan and teal palette.
- Document recipients use visible named checkboxes instead of the iPad native multiple-select menu. No recipients are selected automatically. Empty membership and missing selections have explicit messages; project changes clear recipients and consent. Server membership and source revalidation remain unchanged.
- The separately published private synthetic test Site remains a panel-only simulation; this branch does not update or republish it, and does not enable real document accounts or models.

## Verification

Local JavaScript syntax and all embedded panel scripts parse. Isolated CI runs the existing synthetic unit/PostgreSQL suite and Chromium/WebKit owner flows, including in-workspace drawer mounting, original control retention, disabled-state hiding, focus return and explicit document-recipient selection. CI run [39180057639](https://github.com/LyzabetCampbella2/scotty-core/actions/runs/39180057639) passed at code commit bce9be2aaf623d8e1e6308077212157d46530d88: 117 tests passed, zero failed (21 unit, 80 disposable PostgreSQL, 16 Chromium/WebKit browser tests), plus synthetic build and import checks. The parallel push workflow also passed. Production branch was rechecked unchanged after testing. This verifies isolated behavior, not a live deployment or physical iPad audio.

## Review / activation boundary

Review in this separate development branch. Production cloud-independent-voice remained at d8f8ee2d52db192ce0294d42eb91437b657b2ba3 when work began. Existing feature flags, owner authentication, CSRF protections and scoped source approvals are unchanged. No paid database or service was created. Physical iPad voice/audio and live provider flows have not been verified by these synthetic tests.
