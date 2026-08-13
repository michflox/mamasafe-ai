/**
 * Audit chain integrity tests: append, verify, tamper detection, canonical
 * serialization stability, genesis handling, memory store round-trip.
 */
import { describe, expect, it } from 'vitest';
import {
  appendAuditEvent,
  canonicalSerialize,
  createMemoryStore,
  GENESIS_HASH,
  sha256Hex,
  verifyAuditChain,
} from '@mamasafe/audit';
import type { AuditEvent } from '@mamasafe/audit';

const ACTOR = { id: 'sim-user-1', role: 'SIMULATION_USER' as const };

function seedLog(n: number): AuditEvent[] {
  let log: AuditEvent[] = [];
  for (let i = 0; i < n; i++) {
    const event = appendAuditEvent(log, {
      caseId: 'case-x',
      type: i === 0 ? 'INTAKE_SUBMITTED' : 'ACTION_CONFIRMED',
      at: `2026-08-11T10:0${i}:00.000Z`,
      actor: ACTOR,
      payloadSummary: { seq: i, note: `event ${i}` },
      rulesVersion: 'clinical-rules@1.0.0',
      pathwayVersion: 'pph-pathway.v1@1.0.0',
    });
    log = [...log, event];
  }
  return log;
}

describe('sha256 (pure TS, portable)', () => {
  it('matches the known SHA-256 test vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });
  it('handles unicode (CJK / pidgin text) deterministically', () => {
    expect(sha256Hex('Mama just deliver, she dey bleed steady')).toBe(
      sha256Hex('Mama just deliver, she dey bleed steady'),
    );
  });
});

describe('canonical serialization', () => {
  it('sorts keys recursively and drops undefined', () => {
    const a = canonicalSerialize({ b: 1, a: { d: 2, c: 3 }, u: undefined });
    const b = canonicalSerialize({ a: { c: 3, d: 2 }, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":{"c":3,"d":2},"b":1}');
  });
});

describe('appendAuditEvent / verifyAuditChain', () => {
  it('genesis event links to GENESIS; chain verifies', () => {
    const log = seedLog(3);
    expect(log[0].previousEventHash).toBe(GENESIS_HASH);
    expect(log[1].previousEventHash).toBe(log[0].eventHash);
    expect(log[2].previousEventHash).toBe(log[1].eventHash);
    expect(verifyAuditChain(log).valid).toBe(true);
    expect(verifyAuditChain([]).valid).toBe(true);
  });
  it('detects payload tampering', () => {
    const log = seedLog(3);
    const tampered = log.map((e, i) =>
      i === 1 ? { ...e, payloadSummary: { ...e.payloadSummary, note: 'forged' } } : e,
    );
    const result = verifyAuditChain(tampered);
    expect(result.valid).toBe(false);
    expect(result.firstInvalidEventId).toBe(log[1].eventId);
  });
  it('detects hash tampering and reordering', () => {
    const log = seedLog(3);
    const forged = log.map((e, i) => (i === 1 ? { ...e, eventHash: '0'.repeat(64) } : e));
    expect(verifyAuditChain(forged).valid).toBe(false);
    const reordered = [log[0], log[2], log[1]];
    expect(verifyAuditChain(reordered).valid).toBe(false);
  });
  it('detects a truncated chain presented as complete', () => {
    const log = seedLog(4);
    // an attacker presents events 0,1,3 (dropping 2): event 3's prev hash points at 2
    const truncated = [log[0], log[1], log[3]];
    expect(verifyAuditChain(truncated).valid).toBe(false);
  });
});

describe('memory store', () => {
  it('round-trips appended events', async () => {
    const store = createMemoryStore();
    const log = seedLog(2);
    await store.append(log[0]);
    await store.append(log[1]);
    const loaded = await store.load();
    expect(loaded).toHaveLength(2);
    expect(verifyAuditChain(loaded).valid).toBe(true);
  });
});
