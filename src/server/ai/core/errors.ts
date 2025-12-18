/**
 * Custom Error Classes for AI Module
 *
 * Provides specific error types for better error handling and user feedback.
 */

/**
 * Base error class for AI operations
 */
export class AIError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly cause?: Error,
	) {
		super(message);
		this.name = "AIError";
	}
}

/**
 * Thrown when user has insufficient token balance
 */
export class InsufficientBalanceError extends AIError {
	constructor(
		public readonly currentBalance: number,
		public readonly requiredTokens: number,
	) {
		super(
			`Insufficient token balance. You have ${currentBalance} tokens but need approximately ${requiredTokens} tokens.`,
			"INSUFFICIENT_BALANCE",
		);
		this.name = "InsufficientBalanceError";
	}
}

/**
 * Thrown when authentication fails
 */
export class AuthenticationError extends AIError {
	constructor(message = "Authentication required") {
		super(message, "AUTHENTICATION_REQUIRED");
		this.name = "AuthenticationError";
	}
}

/**
 * Thrown when a required resource is not found
 */
export class ResourceNotFoundError extends AIError {
	constructor(
		public readonly resourceType: string,
		public readonly resourceId?: string,
	) {
		super(
			resourceId
				? `${resourceType} with ID ${resourceId} not found`
				: `${resourceType} not found`,
			"RESOURCE_NOT_FOUND",
		);
		this.name = "ResourceNotFoundError";
	}
}

/**
 * Thrown when AI provider configuration is invalid
 */
export class AIConfigurationError extends AIError {
	constructor(message: string) {
		super(message, "AI_CONFIGURATION_ERROR");
		this.name = "AIConfigurationError";
	}
}

/**
 * Thrown when AI provider returns an error
 */
export class AIProviderError extends AIError {
	constructor(
		message: string,
		public readonly provider: string,
		cause?: Error,
	) {
		super(message, "AI_PROVIDER_ERROR", cause);
		this.name = "AIProviderError";
	}
}

/**
 * Thrown when content violates safety policies
 */
export class ContentPolicyError extends AIError {
	constructor(message = "Content violates safety policies") {
		super(message, "CONTENT_POLICY_VIOLATION");
		this.name = "ContentPolicyError";
	}
}

/**
 * Thrown when rate limit is exceeded
 */
export class RateLimitError extends AIError {
	constructor(
		public readonly limitType: string,
		public readonly retryAfterMs?: number,
	) {
		super(
			`Rate limit exceeded for ${limitType}. Please try again later.`,
			"RATE_LIMIT_EXCEEDED",
		);
		this.name = "RateLimitError";
	}
}

/**
 * Formats an error for user display
 */
export function formatErrorForUser(error: unknown, operation: string): string {
	if (error instanceof InsufficientBalanceError) {
		return error.message;
	}

	if (error instanceof AuthenticationError) {
		return "Please sign in to continue.";
	}

	if (error instanceof ResourceNotFoundError) {
		return `${error.resourceType} not found. Please refresh and try again.`;
	}

	if (error instanceof ContentPolicyError) {
		return "Your request was blocked due to content policy. Please modify your input and try again.";
	}

	if (error instanceof RateLimitError) {
		return error.message;
	}

	if (error instanceof AIConfigurationError) {
		return `AI configuration error: ${error.message}. Please check your settings.`;
	}

	if (error instanceof AIProviderError) {
		return `AI service error: ${error.message}. Please try again.`;
	}

	const message = error instanceof Error ? error.message : "Unknown error";
	return `Failed to ${operation}: ${message}. Please try again.`;
}
