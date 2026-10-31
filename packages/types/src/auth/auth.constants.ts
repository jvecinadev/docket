export const AUTH_SESSION_COOKIE_NAME = "docket_session" as const;

export const AUTH_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export const AUTH_PASSWORD_MIN_LENGTH = 8;
export const AUTH_PASSWORD_MAX_LENGTH = 72;

export const AUTH_OPAQUE_TOKEN_MIN_LENGTH = 32;
export const AUTH_OPAQUE_TOKEN_MAX_LENGTH = 512;

export const AUTH_MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const AUTH_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes