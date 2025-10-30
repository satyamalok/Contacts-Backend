import { nanoid } from 'nanoid';
import * as crypto from 'crypto';

/**
 * Generate a secure API key
 */
export function generateApiKey(): string {
  return `sk_${nanoid(32)}`;
}

/**
 * Generate agent code
 */
export function generateAgentCode(prefix: string = 'AGENT'): string {
  const randomPart = nanoid(8).toUpperCase();
  return `${prefix}${randomPart}`;
}

/**
 * Hash a string using SHA256
 */
export function hashString(input: string, salt?: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(input + (salt || ''));
  return hash.digest('hex');
}

/**
 * Validate phone number format (basic validation)
 */
export function isValidPhone(phone: string): boolean {
  // Allow digits, spaces, dashes, parentheses, and plus sign
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

/**
 * Sanitize contact name
 */
export function sanitizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Format contact for response
 */
export function formatContact(contact: any) {
  return {
    id: contact.id,
    first_name: contact.first_name,
    last_name: contact.last_name,
    phone_primary: contact.phone_primary,
    phone_secondary: contact.phone_secondary,
    created_by_agent: contact.created_by_agent,
    created_at: contact.created_at,
    updated_at: contact.updated_at,
    version: parseInt(contact.version, 10),
  };
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse CSV row to contact object
 */
export function parseCSVRowToContact(row: any): any {
  return {
    first_name: row.first_name || row.firstName || row['First Name'] || '',
    last_name: row.last_name || row.lastName || row['Last Name'] || '',
    phone_primary: row.phone_primary || row.phone1 || row.Phone || row['Phone 1'] || '',
    phone_secondary: row.phone_secondary || row.phone2 || row['Phone 2'] || '',
  };
}

/**
 * Validate contact data
 */
export function validateContact(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.first_name || typeof data.first_name !== 'string' || data.first_name.trim() === '') {
    errors.push('first_name is required and must be a non-empty string');
  }

  if (!data.last_name || typeof data.last_name !== 'string' || data.last_name.trim() === '') {
    errors.push('last_name is required and must be a non-empty string');
  }

  if (data.phone_primary && !isValidPhone(data.phone_primary)) {
    errors.push('phone_primary has invalid format');
  }

  if (data.phone_secondary && !isValidPhone(data.phone_secondary)) {
    errors.push('phone_secondary has invalid format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
