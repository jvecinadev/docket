# Auth API Specification

**Scope:** `auth` module  
**Source Files:** `auth.controller.ts`, `auth.service.ts`, `auth.repository.ts`, `auth.schemas.ts`, `auth.constants.ts`, `auth.router.ts`

---

## Section 0 — Global Configuration

* **Base URL:** `https://api.example.com`
* **Versioning:** `/v1`
* **Content-Type:** `application/json`
* **Auth Model:** Opaque session token delivered via HTTP cookie `docket_session` (Max-Age: 7 days). All authenticated endpoints read the session from this cookie (no Bearer header in this module).
* **Session Lifecycle:** 
  * `register`, `login`, and `refresh` issue a cookie (`Set-Cookie`). 
  * `refresh` rotates the token in place. 
  * `logout`, `logout-all`, `change-password`, and `password-reset/confirm` clear the cookie (`Set-Cookie` with an empty value).
* **Credentials & Data Rules:** 
  * Email is normalized (trimmed + lowercased). 
  * Password: 8–72 characters. 
  * Opaque tokens: 32–512 characters.
* **Security:** Login lockout activates after 5 consecutive failures for 15 minutes.
* **Error Envelope:** Thrown error messages are passed to `next()` and rendered by the global error handler (shape not defined in this module — see Open Items). The controller's own 401s return `{ "message": "string" }`.
* **Rate Limit:** Not enforced in this module.
* **Naming:** All responses use `camelCase`.

---

## Endpoints

### POST /v1/auth/register
Creates a user, opens a session, and sets the session cookie.

* **Auth:** None
* **Idempotency:** Not applicable

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | string | Yes | 1–100 chars, trimmed |
| `email` | string (email) | Yes | ≤254 chars, normalized lowercase |
| `password` | string | Yes | 8–72 chars |

#### Response `201 Created`
* **Header:** `Set-Cookie: docket_session=<token>; Max-Age=604800; HttpOnly`
```json
{
  "user": {
    "id": "uuid",
    "email": "ada@example.com",
    "name": "Ada",
    "emailVerifiedAt": null,
    "lastLoginAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z"
  },
  "session": {
    "id": "uuid",
    "ipAddress": "203.0.113.7",
    "userAgent": "Mozilla/5.0",
    "lastUsedAt": "2026-01-01T00:00:00Z",
    "expiresAt": "2026-01-08T00:00:00Z",
    "revokedAt": null,
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

#### Errors
| Status | Code | When |
| :--- | :--- | :--- |
| `400` | `VALIDATION_FAILED` | Body fails schema; details maps field → reason |
| `409` | `EMAIL_IN_USE` | Email already registered |

---

### POST /v1/auth/login
Authenticates credentials, opens a session, and sets the session cookie.

* **Auth:** None
* **Idempotency:** Not applicable

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | string (email) | Yes | ≤254 chars |
| `password` | string | Yes | 1–72 chars |

#### Response `200 OK`
* Same body shape as `register`; `Set-Cookie` header set.

#### Errors
| Status | Code | When |
| :--- | :--- | :--- |
| `400` | `VALIDATION_FAILED` | Body fails schema |
| `401` | `INVALID_CREDENTIALS` | Unknown email or wrong password; increments failure counter |
| `423` | `ACCOUNT_LOCKED` | Locked after 5 failures; 15 min from last failure |

---

### POST /v1/auth/refresh
Rotates the current session token and reissues the cookie.

* **Auth:** Session cookie
* **Idempotency:** Not applicable (each call rotates)
* **Body:** None

#### Response `200 OK`
* Same body shape as `register`; new `Set-Cookie` header set.

#### Errors
| Status | Code | When |
| :--- | :--- | :--- |
| `401` | `MISSING_SESSION` | No cookie present (returns `{ "message": "Missing session" }`) |
| `401` | `INVALID_SESSION` | Token unknown, expired, or revoked |

---

### POST /v1/auth/logout
Revokes the current session and clears the cookie. Succeeds even without a valid session.

* **Auth:** Session cookie (optional)
* **Idempotency:** Safe to repeat

#### Response `200 OK`
```json
{ "ok": true }
```
* **Errors:** None expected.

---

### GET /v1/auth/me
Returns the authenticated user.

* **Auth:** Session cookie

#### Response `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "ada@example.com",
    "name": "Ada",
    "emailVerifiedAt": null,
    "lastLoginAt": "2026-01-01T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z"
  }
}
```

#### Errors
| Status | Code | When |
| :--- | :--- | :--- |
| `401` | `UNAUTHORIZED` | No session context (returns `{ "message": "Unauthorized" }`) |
| `404` | `USER_NOT_FOUND` | User row missing |

---

### GET /v1/auth/sessions
Lists the caller's active sessions (unrevoked, unexpired), newest first.

* **Auth:** Session cookie

#### Response `200 OK`
```json
{
  "sessions": [
    {
      "id": "uuid",
      "ipAddress": "203.0.113.7",
      "userAgent": "Mozilla/5.0",
      "lastUsedAt": "2026-01-01T00:00:00Z",
      "expiresAt": "2026-01-08T00:00:00Z",
      "revokedAt": null,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### Errors
| Status | Code | When |
| :--- | :--- | :--- |
| `401` | `UNAUTHORIZED` | No session context |

---

### POST /v1/auth/sessions/revoke
Revokes one of the caller's sessions by ID.

* **Auth:** Session cookie
* **Idempotency:** Not applicable

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `sessionId` | string (uuid) | Yes | Must belong to caller |

#### Response `200 OK`
```json
{ "ok": true }
```

#### Errors
| Status | Code | When |
| :--- | :--- | :--- |
| `400` | `VALIDATION_FAILED` | Body fails schema |
| `401` | `UNAUTHORIZED` | No session context |
| `404` | `SESSION_NOT_FOUND` | ID unknown or not owned by caller |

---

### POST /v1/auth/logout-all
Revokes every session for the caller and clears the cookie.

* **Auth:** Session cookie
* **Idempotency:** Safe to repeat

#### Response `200 OK`
* **Header:** `Set-Cookie` clears `docket_session`
```json
{ "ok": true }
```

#### Errors
| Status | Code | When |
| :--- | :--- | :--- |
| `401` | `UNAUTHORIZED` | No session context |

---

### POST /v1/auth/change-password
Changes the password after verifying the current one; revokes all sessions and clears the cookie.

* **Auth:** Session cookie
* **Idempotency:** Not applicable

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `currentPassword` | string | Yes | 1–72 chars |
| `newPassword` | string | Yes | 8–72 chars |

#### Response `200 OK`
* **Header:** `Set-Cookie` clears `docket_session`
```json
{ "ok": true }
```

#### Errors
| Status | Code | When |
| :--- | :--- | :--- |
| `400` | `VALIDATION_FAILED` | Body fails schema |
| `401` | `UNAUTHORIZED` | No session context |
| `401` | `INVALID_PASSWORD` | `currentPassword` mismatch |
| `404` | `USER_NOT_FOUND` | User row missing |

---

### POST /v1/auth/password-reset/request
Creates a password-reset token and emails it. Always returns `200 OK` to avoid account enumeration.

* **Auth:** None
* **Idempotency:** Safe to repeat (invalidates prior tokens)

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | string (email) | Yes | ≤254 chars |

#### Response `200 OK`
```json
{ "ok": true }
```

#### Errors
| Status | Code | When |
| :--- | :--- | :--- |
| `400` | `VALIDATION_FAILED` | Body fails schema |

---

### POST /v1/auth/password-reset/confirm
Consumes the reset token, sets the new password, revokes all sessions, and clears the cookie.

* **Auth:** None
* **Idempotency:** Not applicable (token is single-use)

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `token` | string | Yes | 32–512 chars, from email |
| `newPassword` | string | Yes | 8–72 chars |

#### Response `200 OK`
* **Header:** `Set-Cookie` clears `docket_session`
```json
{ "ok": true }
```

#### Errors
| Status | Code | When |
| :--- | :--- | :--- |
| `400` | `VALIDATION_FAILED` | Body fails schema |
| `400` | `INVALID_RESET_TOKEN` | Token unknown, expired, or already consumed |

---

### POST /v1/auth/email-verification/request
Creates a verification token for the authenticated user and emails it.

* **Auth:** Session cookie
* **Idempotency:** Safe to repeat (invalidates prior tokens)

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | string (email) | Yes | Validated, but currently unused by the handler — see Open Items |

#### Response `200 OK`
```json
{ "ok": true }
```

#### Errors
| Status | Code | When |
| :--- | :--- | :--- |
| `400` | `VALIDATION_FAILED` | Body fails schema |
| `401` | `UNAUTHORIZED` | No session context |
| `404` | `USER_NOT_FOUND` | User row missing |

---

### POST /v1/auth/email-verification/confirm
Consumes the verification token and marks the email verified.

* **Auth:** None
* **Idempotency:** Not applicable (token is single-use)

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `token` | string | Yes | 32–512 chars, from email |

#### Response `200 OK`
```json
{ "ok": true }
```

#### Errors
| Status | Code | When |
| :--- | :--- | :--- |
| `400` | `VALIDATION_FAILED` | Body fails schema |
| `400` | `INVALID_VERIFICATION_TOKEN` | Token unknown, expired, or already consumed |

---

## Open Items (Resolve Before Publishing)

1. **Error Code Mapping:** Error codes are inferred from Error message strings — the global error handler mapping is not in the supplied files. Confirm the actual code values and ensure the envelope matches `{ error: { code, message, details } }`.
2. **Envelope Inconsistency:** `refresh`, `me`, `listSessions`, `revokeSession`, `logoutAll`, `changePassword`, and both email-verification handlers return `{ "message": "..." }` inline for `401`s instead of the global envelope. Either route those through `next()` or document both shapes.
3. **Email-Verification Request Body:** Schema requires `email`, but the controller ignores it and uses `req.auth.userId`. Either drop the field from the schema or make the handler use it.
4. **HTTP Status Confirms:** Status codes for Error throws (e.g., `INVALID_CREDENTIALS` → `401` vs `400`, `USER_NOT_FOUND`/`SESSION_NOT_FOUND` → `404` vs `400`) must be confirmed against the handler implementation.
5. **Auth Header:** Documentation specifies cookie-only. If `extractSessionToken` also accepts `Authorization`, update Section 0.
6. **Rate Limiting & Scopes:** No rate limiting or scopes exist in this module; add them to Section 0 if enforced at the gateway.