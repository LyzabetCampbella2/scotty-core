# SCOTTY Creative Production — Activepieces staging build

**Build date:** 2026-11-07  
**Activepieces project:** Lizzy's Project, `xTfZdRPX3i4JjdOyR5NYq`  
**Folder:** SCOTTY — Creative Production (Staging), `sUcHhwntJiKukxkF06RQM`  
**Status:** 8 flows VALIDATED, **all DISABLED / UNPUBLISHED**; 7 tables; 0 Activepieces app connections; **0 actual media processed, social posts, external account operations, and model runs**. Never confuse these development flows with reusable published Activepieces Agents or the 185 canonical SCOTTY core profiles.

## Architecture

Goal: Model/agent reasoning + persistent scoped brand/media knowledge + narrowly authorized tools + SCOTTY/LUMEN review + exact owner-controlled publishing.

1. **Media intake:** a future authorized Google Drive new/updated-file trigger (or Dropbox folder listing in an approved scope) fetches only file IDs and metadata. Do not enable `include_file_content` until explicitly authorized. Store a source provider/file ID/hash and asset status in the Media Asset Catalog. Never assume filename identifies actual image/video/audio content.
2. **VAULT (asset librarian):** propose tags, canonical names, project folder taxonomy, duplicate candidates and copy-first organization. Require exact source/destination, hash and rollback before any move/rename/delete; do not delete originals.
3. **FRAME (cinematography/video), IRIS (photography), ECHO (audio):** generate shot/edit/retouch/voiceover and accessibility work orders against verified asset IDs. Rendering/editing requires later approved tools, non-destructive source preservation, licenses and output checks.
4. **PULSE (social):** draft truthful platform captions, alt text, calendar entries and metadata. No claims of actually seeing media, analyzing trends or obtaining metrics when source or analytics isn't connected.
5. **LUMEN (chief):** review brand fit, originality, pet welfare, licensing, disclosure, image/music rights, audience, accessibility and release readiness. SCOTTY synthesizes recommendations and requests owner approval before *new* work or scope expansion.
6. **Publisher gate:** verify exact post ID, content revision, channel ID, asset hashes and approved media rights, authorized owner session, exact audience/time, revocation status and idempotency key before calling an external publishing integration. The current gate **always denies** because no server-verified authorization service or social connection exists. Editable Tables values are NOT an owner-signed permission.
7. **Receipts and recovery:** when connectors are added, record remote post ID, platform confirmation, error/retry state and time; prevent duplicate non-idempotent publish calls; never retry blindly.

## Six proposed media agents

| ID | Agent | Job and outputs | Initial tool scope |
| --- | --- | --- | --- |
| `chief-lumen` | **LUMEN** | Creative director; chief review, revisions and SCOTTY handoff | Read-only draft metadata |
| `agent-creative-pulse` | **PULSE** | Strategy, captions, platform drafts, scheduling proposals | Read-only content queue and reviewed brand knowledge |
| `agent-creative-frame` | **FRAME** | Cinematography, video editing/export plans | Read-only public/synthetic transformation requests |
| `agent-creative-iris` | **IRIS** | Photography, contact-sheet, crop and retouch plans | Read-only public/synthetic transformation requests |
| `agent-creative-vault` | **VAULT** | File librarian, metadata, folder structure, checksum and duplicate planning | Read-only public/synthetic media catalog |
| `agent-creative-echo` | **ECHO** | Voiceover, soundtrack rights, transcripts, sound treatment plans | Read-only public/synthetic audio requests |

All six profiles are development proposals, including VAULT and ECHO as two *new* specialists beyond the previous four-person LUMEN proposal. Canonical SCOTTY remains 185; the original optional LUMEN+3 plan of 189 is not silently modified. A hypothetical approval of all six would yield 191, but **no change to the canonical registry has been made**.

## Activepieces flows (8; all unpublished and disabled)

| Flow | ID | State |
| --- | --- | --- |
| VAULT media librarian AI draft | `ryYCwCSnPJdBECmxKwGha` | Valid, disabled |
| PULSE social planner and caption AI draft | `BqZ7Buy3o65gdbO2Xd1ct` | Valid, disabled |
| FRAME cinematography and video AI draft | `tBCuVCd3AUttTDm5rC0Q1` | Valid, disabled |
| IRIS photography and editorial AI draft | `ohpu05MW23qJ4qOre3G9o` | Valid, disabled |
| ECHO audio/voiceover AI draft | `IABi4HL9ySrdr2o3OwMvH` | Valid, disabled |
| LUMEN creative director and chief review AI draft | `GkRnt2NWwM73ob52Jt3DJ` | Valid, disabled |
| Chief dispatcher/handoff proposal | `iOoD5TsatfEruS5ta1k7y` | Valid, disabled |
| Publishing and deduplication blocker audit | `YnLUGFuOGU5RMc0H6rbZr` | Valid, disabled |

Each AI draft flow reads metadata from an Activepieces Table, consults approved-public knowledge and approved brand playbooks, strips non-eligible record fields, and passes **only synthetic-public demo** records to an unrun `@activepieces/piece-ai:run_agent` step. The model selected for draft configuration is `activepieces/google/gemini-2.5-flash`, max 2 agent steps, **no agent tool actions**, no retries or output-side platform calls. If someone later publishes these flows, model usage may incur Activepieces credits; obtain an owner-approved model, budget, rate limit and privacy policy before doing so. No model testing has been performed.

Non-AI dispatcher makes **proposals**, not assignments; no true specialist→chief messages have been sent. Publishing audit always returns missing signed-grant/account/rights blockers, no posts.

## Activepieces tables (7)

| Table | ID | Seed rows |
| --- | --- | --- |
| Media Asset Catalog (staging metadata) | `q09QH39yo4bWl7zUi783y` | 3 synthetic |
| Content Calendar & Post Queue | `ei3QzsRg7BJ5jTTjgU6OP` | 2 synthetic |
| Brand Playbooks (development) | `89tPE954SzOuYiEpBmVBu` | 2 owner-review-pending drafts |
| Agent Jobs & Handoffs | `KNeSpphK3Kz1ZjSXIhoHp` | 5 synthetic |
| Media Transform Requests | `WISbj23Lq54TZpOTnS308` | 3 synthetic |
| Individual Agent Profiles | `XFOzzkETNDpUyd2BFVCfF` | 6 draft profiles |
| Approved Public Knowledge | `YS4YnDVucSL5soYPvtvsJ` | 3 **unapproved** synthetic procedural drafts |

No real photos, videos, audio, storage paths, social tokens, user-private media or files have been imported. Demo rows use labels `DEMO-...` / `synthetic-public-demo` and `NONE-NO-FILE-ACCESS`. The three knowledge notes are unreviewed and therefore **not** included as approved model knowledge.

### Folder taxonomy proposal

```
Creative_Library/
  Golden_Hour_Creative/
    Campaigns/<Campaign_ID>/
      00_Inbox/
      01_Photo/Originals/Working/Exports/
      02_Video/Originals/Working/Exports/
      03_Audio/Voiceovers/Licensed_Music/Exports/
      04_Designs/
      05_Captions_Transcripts/
      06_Ready_for_Review/
      07_Approved_for_Publishing/
      08_Published_Receipts/
      09_Archive_Backups/
    Brand_Kit/
  Eirden_Atelier/
    Campaigns/<Campaign_ID>/
      00_Inbox/
      01_Photo/
      02_Video/
      03_Audio/
      04_Designs/
      05_Approvals/
      06_Published_Receipts/
```

Folder hierarchy is **proposed only**; no directory was created in Dropbox, Google Drive, Canva or the user's computer.

## Required connections and permissions

**Currently, Activepieces reports ZERO active app connections.** To make real work possible:

1. Choose one **source-of-truth media storage**: connect Dropbox OAuth or Google Drive through Activepieces Settings → Connections. Grant a dedicated creative folder, not the entire drive when possible. Start read-only metadata inventory; don't include file contents initially.
2. Connect Canva only if the agent will import/export or organize Canva assets. Asset upload/export/relocation actions can create duplicates or charges; initially limit to inspecting design metadata.
3. Connect a publishing integration such as Buffer (Buffer access token via Activepieces Connections), or supported platform-native connectors where appropriate. Buffer's `create_post` can draft/queue/schedule or publish to selected channels, has explicit scheduling mode, and is **not idempotent**. It currently exposes image URLs, not a general video upload input, so video/reels routing requires separate platform-specific verification before production claims.
4. Review creative brand playbooks, public knowledge scope and source content rights. Configure model/cost and fixed operation limits, then authorize safe synthetic tests in staging.
5. Implement server-signed owner approval and idempotency before enabling any external post, media move, delete, share or publish. No active flow should treat a mutable table cell as sufficient proof.
6. Only after a fully reviewed end-to-end test should specific flows be published/enabled; do not publish all agents together.

## Verification

- Activepieces folder validation: `ok=true`, **8/8 flows validated**, `issues=[]`, 7 tables checked.
- All eight flows are **DISABLED and UNPUBLISHED**; existing 15 SCOTTY staging flows and the separate original disabled connection test are unchanged.
- Project after this build: **24 flows, 17 tables, 0 connections**.
- No flow was executed, no AI credits were intentionally consumed, no real posting or media operations were done. The only writes were staging table/flow definitions and clearly labeled synthetic development records.
