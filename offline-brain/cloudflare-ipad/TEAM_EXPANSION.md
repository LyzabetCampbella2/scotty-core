# SCOTTY team brain foundation

Target: SCOTTY overseer + 25 chiefs + 160 subordinate specialists = 186 roles.

This draft adds a pure expansion planner, per-agent brain schema and bounded keyword routing. It is deliberately not imported into the deployed Worker or production. It makes no AI calls or database writes. Existing Cloudflare lab remains a 128-profile synthetic demonstration.

The production source src/agents/cloud.ts on cloud-independent-voice defines 12 fallback chiefs (SPOCK, WORF, DATA, QUARK, KIRK, UHURA, GEORDI, KEIKO, PICARD, BONES, ZORA, RIKER), plus 116 fallback specialists. The database may contain a different imported roster. Source fallback is not proof of actual live identities. Tests use labelled fixtures, not exported private records.

expandTeam(existingRoster) requires a complete existing roster. It copies every existing field, ID, name and chief relationship and adds only enough records to reach target. For a 12-chief / 116-specialist roster it adds 13 chiefs and 44 specialists. Oversized teams, duplicate IDs and missing reporting links fail rather than deleting members. Existing names take precedence over proposed new names. Re-expansion is idempotent. Proposed names and departments are editable design defaults, not confirmed historic agents.

brainProfile(agent) defines responsibility, individual and department memory namespaces, shared reviewed knowledge, source review dates and tool permissions. Storage and updates are explicitly unconfigured. No model is trained and no expertise guarantee is implied. Tools are denied until explicitly connected.

planAssignment(roster,question) selects at most four matching specialists by default (maximum eight), includes their actual chiefs and orders review: specialist findings, chief review, SCOTTY synthesis. No lexical match returns needs-clarification. This is transparent keyword matching, not semantic AI orchestration. Selection is a proposal; it does not execute the task.

Next implementation stages:
1. Owner-only, local processing of a complete authoritative roster export; compare identities with the existing registry without committing private memory or client records.
2. Connect the expanded registry to the isolated Worker and iPad catalog; test accurate counts and preservation.
3. Add separately scoped persistent storage for private, department and reviewed shared records, with project permissions and provenance.
4. Add source refresh with publisher allowlists, fetch timestamps, freshness limits and review before facts enter shared memory.
5. Add bounded Workers AI execution: selected specialists, chief review, SCOTTY synthesis, explicit budgets and resumable missions. No Groq dependency.

No deployment, merge, paid service, production database connection or model call is authorized by this module. Existing staging branch gates remain unchanged. Run:

    node --test offline-brain/cloudflare-ipad/team-expansion.test.mjs

Validation: six local Node tests passed. Actual roster import, browser integration, persistent memory, live source refresh and live Workers AI remain outstanding.
