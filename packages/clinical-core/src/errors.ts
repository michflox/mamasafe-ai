/**
 * Error contract (docs/API_CONTRACTS.md §2.7):
 * engine functions never throw on clinical ambiguity; they throw
 * ClinicalRuleError only on malformed input or uncited rule data —
 * programmer/configuration errors, which are test failures.
 *
 * OutOfScopeError is the ONE sanctioned clinical rejection (gate G7):
 * pediatric patients are out of scope for this module by data-file rule
 * (`medications.v1.json` global_rules.scope_guard). It is a subtype of
 * ClinicalRuleError so callers can catch either; it carries a safe,
 * non-clinical message and never contains dosing content.
 */
export class ClinicalRuleError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ClinicalRuleError';
    this.code = code;
  }
}

export class OutOfScopeError extends ClinicalRuleError {
  constructor(message: string) {
    super('OUT_OF_SCOPE', message);
    this.name = 'OutOfScopeError';
  }
}
