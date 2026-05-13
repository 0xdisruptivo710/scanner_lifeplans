import { BANNED_PHRASES, MSG_MAX, MSG_MIN } from './constants';

export type Validation = {
  valid: boolean;
  warnings: string[];
  errors: string[];
  cleaned: string;
};

export function validateMessage(input: string): Validation {
  const warnings: string[] = [];
  const errors: string[] = [];
  let cleaned = input;

  if (cleaned.includes('—')) {
    cleaned = cleaned.replace(/ — /g, ', ').replace(/—/g, ', ');
    warnings.push('Travessão substituído por vírgula');
  }

  if (cleaned.length < MSG_MIN) {
    errors.push(`Mínimo ${MSG_MIN} caracteres (atual: ${cleaned.length})`);
  }
  if (cleaned.length > MSG_MAX) {
    errors.push(`Máximo ${MSG_MAX} caracteres (atual: ${cleaned.length})`);
  }

  const lower = cleaned.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      errors.push(`Frase comercial agressiva: "${phrase}"`);
    }
  }

  return { valid: errors.length === 0, warnings, errors, cleaned };
}
