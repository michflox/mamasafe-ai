/**
 * createAIGateway — adapter selection per docs/API_CONTRACTS.md §3.6.
 * Returns GeminiGateway only when connectivity AND an API key are present;
 * otherwise the mandatory OfflineFallbackGateway. Selection is audited.
 */
import { GeminiGateway, type GeminiTransport } from './gemini.js';
import { OfflineFallbackGateway } from './offlineFallback.js';
import { GEMINI_MODEL_VERSION, type AIGateway, type GatewayAuditHook } from './types.js';

export interface CreateAIGatewayOptions {
  online: boolean;
  apiKey?: string;
  model?: string;
  transport?: GeminiTransport;
  onAuditEvent?: GatewayAuditHook;
}

export function createAIGateway(opts: CreateAIGatewayOptions): AIGateway {
  if (opts.online && opts.apiKey) {
    opts.onAuditEvent?.({
      type: 'AI_CALL_MADE',
      modelVersion: GEMINI_MODEL_VERSION,
      detail: 'GeminiGateway selected (online + API key present)',
    });
    return new GeminiGateway({
      apiKey: opts.apiKey,
      model: opts.model,
      transport: opts.transport,
      onAuditEvent: opts.onAuditEvent,
    });
  }
  return new OfflineFallbackGateway();
}
