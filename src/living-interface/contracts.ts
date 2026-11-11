/**
 * SCOTTY Living Interface V4 — integration contract.
 * Staging scaffold only: no live agent, home, memory, or payment calls.
 * The interface is a presentation client, never an authority.
 */
export type AgentKind = "chief" | "specialist";
export type RuntimeStatus = "demo" | "available" | "busy" | "offline" | "blocked" | "unknown";
export type Interaction = "inspect" | "pickup" | "carry" | "drop" | "throw" | "gift" | "store" | "use" | "operate";
export type Mode = "simulation" | "live-readonly" | "live-approved";
export type Role = "owner" | "agent" | "guest";

export interface CrewIdentity {
  canonicalAgentId: string; // never infer from display name or room number
  chiefId: string | null;
  kind: AgentKind;
  displayName: string;
  department: string;
  professionalFields: string[];
  status: RuntimeStatus;
  statusVerifiedAt: string | null;
}
export interface Room {
  roomId: string;
  agentId: string | null; // null for Bridge, Nexus, Holodeck, etc.
  templateId: string;
  sceneAssetId: string;
  portalDestinationId: string;
  environment: { paletteId: string; lightingId: string; ambienceId: string };
  objects: string[];
}
export interface WorldObject {
  objectId: string;
  roomId: string;
  class: "universal" | "professional";
  professionalField?: string;
  allowedActions: Interaction[];
  portable: boolean;
  physicsEnabled: boolean;
  currentHolderId: string | null;
  position: { x: number; y: number; z: number };
  version: number;
}
export interface Principal {
  id: string;
  role: Role;
  canonicalAgentId?: string;
  professionalFields: string[];
}
export interface ActionRequest {
  requestId: string;
  origin: "hud" | "portal" | "voice" | "agent" | "sensor";
  mode: Mode;
  principal: Principal;
  target: { type: "world-object" | "home-device" | "agent-tool" | "memory"; id: string };
  operation: string;
  ownerApprovalId?: string; // data only, not proof of approval
}
export interface Decision {
  allowed: boolean;
  reason: string;
  requiresFreshOwnerApproval: boolean;
}

/** Cosmetic objects may be handled by anyone, subject to the object's action/physics rules. */
export function canInteractWithObject(
  principal: Principal,
  object: WorldObject,
  action: Interaction
): Decision {
  if (!object.allowedActions.includes(action)) return { allowed: false, reason: "ACTION_NOT_SUPPORTED", requiresFreshOwnerApproval: false };
  if (["pickup", "carry", "throw", "gift", "store"].includes(action) && !object.portable) {
    return { allowed: false, reason: "NOT_PORTABLE", requiresFreshOwnerApproval: false };
  }
  if (object.class === "professional" && (
    !object.professionalField ||
    principal.role !== "agent" ||
    !principal.canonicalAgentId ||
    !principal.professionalFields.includes(object.professionalField)
  )) return { allowed: false, reason: "PROFESSIONAL_FIELD_RESTRICTED", requiresFreshOwnerApproval: false };
  return { allowed: true, reason: "WORLD_ACTION_ONLY", requiresFreshOwnerApproval: false };
}

/** Fail closed until the real WORF/owner gateway verifies permissions server-side. */
export function previewExternalAction(req: ActionRequest): Decision {
  if (req.mode === "simulation") return { allowed: false, reason: "SIMULATION_NO_EXTERNAL_EXECUTION", requiresFreshOwnerApproval: false };
  if (req.mode === "live-readonly" && req.operation === "read") return { allowed: false, reason: "GATEWAY_NOT_CONNECTED", requiresFreshOwnerApproval: false };
  return { allowed: false, reason: "AUTHORIZATION_GATEWAY_NOT_CONNECTED", requiresFreshOwnerApproval: true };
}

export function validateRoster(crew: CrewIdentity[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const a of crew) {
    if (!a.canonicalAgentId) errors.push("MISSING_CANONICAL_ID");
    if (ids.has(a.canonicalAgentId)) errors.push("DUPLICATE_CANONICAL_ID:" + a.canonicalAgentId);
    ids.add(a.canonicalAgentId);
  }
  if (crew.length !== 185) errors.push("EXPECTED_185_AGENTS_GOT_" + crew.length);
  if (crew.filter(a => a.kind === "chief").length !== 25) errors.push("EXPECTED_25_CHIEFS");
  if (crew.filter(a => a.kind === "specialist").length !== 160) errors.push("EXPECTED_160_SPECIALISTS");
  return { ok: errors.length === 0, errors };
}
