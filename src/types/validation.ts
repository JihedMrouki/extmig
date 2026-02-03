import { z, ZodError } from 'zod';

/**
 * Result wrapper for validation operations
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError };

/**
 * Validation error with detailed messages
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly zodError?: ZodError,
    public readonly details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  /**
   * Get formatted error messages
   */
  getMessages(): string[] {
    if (this.zodError) {
      return this.zodError.issues.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
    }
    return [this.message];
  }
}

/**
 * Safe validation wrapper that returns ValidationResult
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      const details: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const path = issue.path.join('.');
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(issue.message);
      }

      return {
        success: false,
        error: new ValidationError(
          `Validation failed: ${error.issues.length} error(s)`,
          error,
          details
        ),
      };
    }
    return {
      success: false,
      error: new ValidationError('Unknown validation error'),
    };
  }
}

/**
 * Parse and validate, throwing on error
 */
export function parseOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = validate(schema, data);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

/**
 * Validate extension ID format
 */
export function isValidExtensionId(id: string): boolean {
  return /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/.test(id);
}

/**
 * Parse extension ID into publisher and name
 */
export function parseExtensionId(id: string): {
  publisher: string;
  name: string;
} | null {
  if (!isValidExtensionId(id)) {
    return null;
  }

  const [publisher, name] = id.split('.');
  return { publisher, name };
}

/**
 * Create extension ID from publisher and name
 */
export function createExtensionId(publisher: string, name: string): string {
  return `${publisher}.${name}`;
}

/**
 * Normalize extension ID (lowercase)
 */
export function normalizeExtensionId(id: string): string {
  return id.toLowerCase();
}
