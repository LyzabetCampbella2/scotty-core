# Isolated iPad project panels and document selection

Date: October 18, 2026. Development branch: `dev/ipad-sandbox-documents-20261018`, stacked on team insights in PR #12. Review: [draft PR #13](https://github.com/LyzabetCampbella2/scotty-core/pull/13).

## Isolated test HUD

The separate owner-private test Site renders the same project operations panels with a browser-memory-only synthetic API. It includes 128 sample agents including 12 sample chiefs, one sample writing project, Google Docs/Notion fixtures, explicit evidence consent, mission approval, synthetic step execution, chief comparison, development records and weekly review panels.

This is a project-panel simulation, not a deployment of the full production canvas or Scottish audio stack. Its permanent banner labels synthetic data. No database, token, real document, model or audio provider is configured. The fixture intercepts all API requests; unknown routes and external fetches fail rather than falling through to a network service. The packaged page also blocks outbound connections with its content security policy. Changes are held in browser memory and reset when refreshed.

Use the test Site to list a sample document, preview it, select recipients and check the explicit approval box. Then recommend a sample team, save and approve its plan, start the mission, and use **Run synthetic step** to advance each draft. The normal live-generation control stays disabled. Detailed production editors are not connected in this isolated panel test.

## Read-only project document picker

The development code adds **Connect project documents** to the existing project operations view. It reuses Scotty's configured Google Docs and Notion connector layer; it does not copy ChatGPT connector credentials or reconnect accounts automatically.

- `SCOTTY_PROJECT_DOCUMENTS_ENABLED=true` is required; live access defaults off. Existing owner authentication, project operations flags and CSRF protection still apply.
- Google listing retrieves IDs/titles/revisions only, at most 100 configured entries; body text is retrieved only after explicit selection. Existing configured document allowlists remain enforced.
- Notion selection is limited to pages available through the configured integration. Nested blocks or additional pages not read are explicitly marked partial. Listing shows up to 50 matching entries; search can narrow the selection.
- Preview reads do not make the text available to agents. A preview is project-bound, expires in ten minutes, and requires explicit recipient approval before attachment. No arbitrary URLs are fetched.
- Attachment rereads the source and rejects changed text. Approval stores a dated snapshot through the existing scoped evidence controls and audit. A preview can be consumed once; invalid/expired previews must be refreshed.
- Source providers remain read-only. No document creation, edit, deletion or external message operation is available through this picker. Existing connector token maintenance is handled by the configured reader, not by the browser.
- Approved snapshots do not update automatically when remote content later changes. Review and approve a new snapshot to refresh evidence. Preview text is held only in bounded server memory; restarting a process invalidates it.

The isolated Site uses synthetic documents only. Live ChatGPT-connected app access cannot be enabled there because the required Sites connector-eligibility capability is unavailable in this tool surface. No provider credentials or private document contents are placed in the Site source. Live account verification remains blocked and is not claimed as complete.

## Verification and readiness

Validation uses synthetic data and disposable PostgreSQL only. It covers document extraction, empty/oversized text, partial Notion content, disabled live access, scoped consent, changed remote text, cross-project previews, recipient membership, authentication/CSRF, one-use previews and roster/brain/memory integrity. Browser checks exercise sample document approval and teamwork with no API network requests in Chromium and WebKit.

Tested source: `709da01f084c2db601d40e1a531a69478ed5c099`. [CI run 39175906141](https://github.com/LyzabetCampbella2/scotty-core/actions/runs/39175906141) passed **115 checks, zero failed**: 21 unit, 80 disposable PostgreSQL, nine Chromium and five WebKit browser checks, plus static sandbox build and bridge/storage import checks. The initial browser run exposed a dynamic label mismatch on the recipient selector; fixed explicit accessibility labels passed the full suite.

The separate Site's access policy was verified owner-only: one owner, no other viewers, editors or groups. Its source commit is `cea0331b42091cb85db172f663dfda4b6eb19107`. Saved version 1 is `appgprj_6ad551b3eda481918b2dc1ade45d1313~appgver_0dbff516bf00819189b3b1830215e87b`; its deployment ID is null. Publication remains pending explicit approval under the owner's earlier instruction not to deploy without approval. No live test URL is claimed. The downloadable HTML is built at `/workspace/sites/scotty-project-test/dist/index.html`.

Production `cloud-independent-voice` remained at `d8f8ee2d52db192ce0294d42eb91437b657b2ba3`; staging `staging/agent-brains-render-part1` remained at `bd009d62a8624f37e3ff11472e9719031ae5e39a` after verification. No production or staging branch merge/deployment, production database access, credential change, paid database creation, recurring schedule or live model/audio call was performed. Physical iPad microphone/audio and real-provider validation remain outstanding. Real document connectivity has been implemented and tested with injected readers; it is not enabled or verified against live accounts.
