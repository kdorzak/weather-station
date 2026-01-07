
# User Authentication & Authorization (Web Dashboard)

This document defines how **human users** authenticate to the web dashboard and how
their requests are authorized.

This is separate from **device authentication** (HMAC) described in `auth.md`.

Chosen approach (v1):
- Google OAuth 2.0 + OpenID Connect (OIDC) for user sign-in
- Application session using secure, HTTP-only cookies

---

## 1. Goals

- No passwords stored by the app
- Simple, secure sign-in UX
- Server-managed sessions (no access tokens in JavaScript)
- Clear authorization model (users can only access their own account/devices)
- Future-proof for additional providers (GitHub, email magic link, etc.)

---

## 2. Identity Model

### 2.1 User
A user is identified primarily by the OIDC **subject** (`sub`) for a provider.

Store:
- `provider` (string, e.g. `"google"`)
- `provider_subject` (string, the OIDC `sub`, stable)
- `email` (string, display/contact; can change)
- `name` (string, optional)
- `avatar_url` (string, optional)

**Do not** use email as a primary identifier.

### 2.2 Account (Workspace / Tenant)
An account groups devices and users.

- `devices` belong to an `account`
- `users` are members of one or more accounts with a role

### 2.3 Roles (v1)
- `owner` – manage billing/account/users/devices
- `admin` – manage devices (add/remove/configure)
- `viewer` – read-only access

---

## 3. Authentication Flow (Google OIDC)

### 3.1 Overview (Authorization Code Flow)
1. User clicks “Sign in with Google”
2. Browser is redirected to Google authorization endpoint
3. Google redirects back to our callback endpoint with an authorization code
4. Backend exchanges the code for tokens (including an ID Token)
5. Backend verifies the ID Token and creates (or finds) the user
6. Backend creates a server session and sets a session cookie
7. User is redirected into the dashboard

The backend is the only component that handles tokens.

---

## 4. HTTP Endpoints (v1)

### 4.1 Start Login
```
GET /auth/google
```

Behavior:
- creates a short-lived login state (CSRF protection for OAuth)
- redirects to Google with:
  - `client_id`
  - `redirect_uri`
  - `response_type=code`
  - `scope=openid email profile`
  - `state=<random>`
  - `nonce=<random>` (recommended)

### 4.2 Callback
```
GET /auth/google/callback
```

Backend MUST:
- validate `state`
- exchange `code` for tokens
- verify ID Token signature and claims:
  - `iss` is valid for Google
  - `aud` matches our `client_id`
  - `exp` not expired
  - `nonce` matches (if used)
- read `sub`, `email`, `name`, `picture`
- upsert user by (`provider`, `provider_subject`)
- create a session and set cookie
- redirect to the app UI

### 4.3 Logout
```
POST /auth/logout
```

Backend:
- invalidates the server session
- clears the session cookie

---

## 5. Session Management

### 5.1 Session Cookie
The backend issues a session cookie (opaque random id or signed session token).

Cookie requirements:
- `HttpOnly`
- `Secure`
- `SameSite=Lax` (or `Strict` if it works for your flows)
- `Path=/`
- reasonable expiry (e.g., 7–30 days) with rolling renewal

Example:
```
Set-Cookie: weathera_session=...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

### 5.2 Session Storage
Two valid approaches:
- **DB-backed sessions** (recommended): store session id, user id, expiry, revocation
- **Signed cookie sessions**: store session payload in cookie (keep small)

---

## 6. CSRF and Browser Security

Because authentication uses cookies, CSRF protections are required for state-changing requests.

Recommended strategy:
- Use `SameSite=Lax`
- For `POST/PUT/PATCH/DELETE`, require a CSRF token:
  - token stored in a non-HttpOnly cookie or embedded in HTML
  - token sent by client in `X-CSRF-Token` header
  - backend validates token matches session

Also recommended:
- Set `Content-Security-Policy` (CSP)
- Enable `X-Content-Type-Options: nosniff`

---

## 7. Authorization Rules

Backend MUST enforce:
- every authenticated request maps to a `user_id` via the session
- all access is scoped by account membership
- user may only access devices belonging to their accounts
- role-based permissions are checked for write actions

---

## 8. Account Onboarding Policy (v1)

Choose one of the following policies (implementation-specific):

### Option A: Invite-only (recommended for early stages)
- user may sign in
- access granted only if user email is in an allowlist OR has an invitation

### Option B: Auto-create on first login
- on first login, create a new account owned by that user

The policy must be consistent with product goals and security needs.

---

## 9. Auditing and Logging

Backend SHOULD log security-relevant events (without sensitive data):
- login success/failure (reason)
- logout
- session creation/revocation
- role changes / invitations
- device ownership changes

Do not log:
- OAuth tokens
- ID tokens
- session cookie values

---

## 10. Future Extensions

- Add additional identity providers (GitHub, Microsoft)
- Add WebAuthn / passkeys
- Add API tokens for CLI access
- Add mTLS for admin operations (optional)

---

## 11. Versioning

This scheme is versioned as `user-auth.v1`.

Breaking changes require:
- new endpoints and/or
- new session cookie name and semantics