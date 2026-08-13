/**
 * Hash-chained append-only audit log — contracts in docs/API_CONTRACTS.md §2.6.
 * eventHash = SHA-256(canonical(event without hashes) + previousEventHash).
 * Canonical serialization: JSON with recursively sorted keys — stable across
 * runtimes, so chains are replayable and verifiable anywhere.
 */
import { sha256Hex } from './sha256.js';

export type AuditEventType =
  | 'INTAKE_SUBMITTED' | 'RISK_ASSESSED' | 'PATHWAY_STARTED'
  | 'ACTION_CONFIRMED' | 'ACTION_OVERRIDDEN' | 'DOSE_CONFIRMED'
  | 'ESCALATION_TRIGGERED' | 'REFERRAL_NOTE_GENERATED' | 'HANDOFF_GENERATED'
  | 'AI_CALL_MADE' | 'AI_FALLBACK_USED' | 'SIMULATION_STARTED' | 'SIMULATION_STATE_CHANGED'
  | 'SYNC_COMPLETED';

export type AuditActorRole =
  | 'MIDWIFE' | 'NURSE' | 'CHEW' | 'COMMUNITY_HEALTH_OFFICER'
  | 'PHYSICIAN' | 'ANESTHESIA_PROVIDER' | 'SIMULATION_USER' | 'SYSTEM';

export interface AuditActor {
  id: string;
  role: AuditActorRole;
}

export interface AuditEvent {
  eventId: string;
  caseId: string;
  type: AuditEventType;
  at: string;
  actor: AuditActor;
  payloadSummary: Record<string, unknown>;
  rulesVersion: string;
  pathwayVersion: string;
  modelVersion?: string;
  previousEventHash: string;
  eventHash: string;
}

export const GENESIS_HASH = 'GENESIS';

/** Recursively key-sorted JSON — canonical across engines. */
export function canonicalSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalSerialize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalSerialize(obj[k])}`).join(',')}}`;
}

function randomId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // fallback: non-crypto UUID v4 shape (local pseudonymous id only)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Append one event to the chain. Returns the new event; the caller's full
 * log is [...log, returned]. Pure and synchronous.
 */
export function appendAuditEvent(
  log: readonly AuditEvent[],
  event: Omit<AuditEvent, 'eventId' | 'previousEventHash' | 'eventHash'>,
): AuditEvent {
  const previousEventHash = log.length === 0 ? GENESIS_HASH : log[log.length - 1].eventHash;
  const partial = {
    ...event,
    eventId: randomId(),
    previousEventHash,
  };
  const eventHash = sha256Hex(canonicalSerialize(partial));
  return { ...partial, eventHash };
}

/** Verify the full chain. Detects tampering with payload, ordering, or hashes. */
export function verifyAuditChain(log: readonly AuditEvent[]): { valid: boolean; firstInvalidEventId?: string } {
  let expectedPrev = GENESIS_HASH;
  for (const event of log) {
    if (event.previousEventHash !== expectedPrev) {
      return { valid: false, firstInvalidEventId: event.eventId };
    }
    const { eventHash, ...rest } = event;
    const recomputed = sha256Hex(canonicalSerialize(rest));
    if (recomputed !== eventHash) {
      return { valid: false, firstInvalidEventId: event.eventId };
    }
    expectedPrev = eventHash;
  }
  return { valid: true };
}
