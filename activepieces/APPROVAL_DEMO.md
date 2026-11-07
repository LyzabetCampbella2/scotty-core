# Step 4 — Human review of SCOTTY's proposed team (demonstration)

**Status:** Activepieces Cloud experiment. The active GitHub branch is still a draft. This does **not** grant any permission in the live SCOTTY backend.

## Your verified Step 3 result
For a fictional frontend engineering task:
- Helm (agent-geordi-02) reporting to GEORDI
- TORRES frontend engineering (agent-expansion-012) reporting to TORRES
- SCOTTY proposed as overseer
- status=PENDING_OWNER_APPROVAL; 0 AI calls, 0 memory writes, 0 missions created.

## Step 4A — Make a readable, checked approval packet
1. In your existing manually-triggered Activepieces flow add a **Code** step after the successful **SCOTTY — Suggest Team** step.
2. Name it **SCOTTY — Prepare Review**.
3. Copy this entire Code action from the repo (keep the exported `code` entrypoint unchanged):
   https://github.com/LyzabetCampbella2/scotty-core/blob/feat/scotty-activepieces-ipad-bridge-20261106/activepieces/steps/prepare-review.mjs
4. Under Inputs add `proposal` and map it to the **entire Step 4 Code output** (not the raw HTTP directory output). If the picker offers individual fields, pick the complete output object.
5. Test it. Expect type=SCOTTY_INERT_REVIEW_PACKET, canExecute=false, backendAuthorization=false, approvalRecorded=false, missionsStarted=0.

## Step 4B — Add a *real pause* before any future action
1. After **SCOTTY — Prepare Review**, add an action by searching **Approval (Legacy)**.
2. Select **Wait for Approval**, *not* "Create Approval Links" (that latter action does **not** pause the flow).
3. Where the piece requests a payload or message, map the prior step's `description` so you can review the exact named agents and task. Follow the UI's current fields; they can vary by release.
4. Test an approve and reject path as a **demo only**. The wait-for-approval step can require a flow run to be actually started and may remain pending until you visit the approval link. Keep the approval link private, because it may act like a bearer capability for that particular run.
5. If you want the next stage to show the decision, use the UI's condition/branch piece to inspect the *actual* approval result field returned by Activepieces, not a manually typed "approved=true" input. Default any unrecognized/empty/timeout value to rejected.
6. **Do not add any action after the approval that changes SCOTTY, sends messages, saves memory, triggers AI, runs GitHub writes or spends money.** A human approval in Activepieces is not automatically an authorization token recognized by SCOTTY.

This is a *runtime* approval action. It is distinct from Activepieces **Flow Approvals** for sensitive project publishing, which is separately gated to higher plans. The Approval (Legacy) piece is advertised on Free Cloud but your account's available actions and limits should be checked in the editor.

## Later real-task execution (not part of this demo)
A future SCOTTY backend must accept an authenticated owner approval through a trusted session, validate project membership and exact mission revision/scope, require an idempotency key, retain an auditable approval event and provide a narrowly authorized execution API. Do not treat a text approval link or a boolean passed from a public automation workflow as backend authorization.

Official references:
- https://www.activepieces.com/pieces/approval
- https://www.activepieces.com/docs/flows/flow-approvals
- https://www.activepieces.com/docs/install/reference/limits
