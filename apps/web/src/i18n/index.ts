/**
 * i18n scaffold — clinician-facing and patient-facing string domains are
 * NEVER mixed. English ships now; pcm/ha/yo/ig folders are scaffolded for
 * professional translation. Drug names, doses, concentrations, units, and
 * thresholds are protected tokens — never translated (translation_lock).
 */
import type { Locale, StringDomain } from '@mamasafe/clinical-core';

import enClinician from './locales/en/clinician.json';
import enPatient from './locales/en/patient.json';

type Strings = Record<string, string>;

const TABLE: Record<Locale, Record<StringDomain, Strings>> = {
  en: { CLINICIAN_FACING: enClinician, PATIENT_FACING: enPatient },
  // Scaffolded locales fall back to English until professional translation
  // + human review lands (machine translation is always a draft — PRD FR-I18N-4).
  pcm: { CLINICIAN_FACING: enClinician, PATIENT_FACING: enPatient },
  ha: { CLINICIAN_FACING: enClinician, PATIENT_FACING: enPatient },
  yo: { CLINICIAN_FACING: enClinician, PATIENT_FACING: enPatient },
  ig: { CLINICIAN_FACING: enClinician, PATIENT_FACING: enPatient },
};

export const SUPPORTED_LOCALES: { id: Locale; label: string; shipped: boolean }[] = [
  { id: 'en', label: 'English', shipped: true },
  { id: 'pcm', label: 'Nigerian Pidgin (scaffold)', shipped: false },
  { id: 'ha', label: 'Hausa (scaffold)', shipped: false },
  { id: 'yo', label: 'Yoruba (scaffold)', shipped: false },
  { id: 'ig', label: 'Igbo (scaffold)', shipped: false },
];

export function t(key: string, domain: StringDomain = 'CLINICIAN_FACING', locale: Locale = 'en'): string {
  return TABLE[locale][domain][key] ?? TABLE.en[domain][key] ?? key;
}

export const PROTECTED_TOKEN_NOTE =
  'Medication names, doses, units, and thresholds are never translated; they appear in canonical English in every language.';
