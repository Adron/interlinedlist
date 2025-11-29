# Phase 2: Authentication System - Implementation Plan

## Overview

Phase 2 implements a complete authentication system for InterlinedList, including user registration, login, JWT token management, OAuth integration, and frontend authentication components. This phase establishes the foundation for user management and secure access to the application.

## Technology Decisions

- **Password Hashing**: bcryptjs (12 rounds)
- **JWT Library**: jsonwebtoken
- **Token Strategy**: Short-lived access tokens (15m) + Long-lived refresh tokens (7d)
- **Session Management**: Database-backed sessions with JWT tokens
- **OAuth Providers**: Google, GitHub, Mastodon, Blue Sky (extensible architecture)
- **Frontend State**: React Context API

## Section 2.1: Database Schema - Authentication Tables

### 2.1.1 Prisma Schema Definition

**Tasks:**

1. Define User model
   - id (UUID, primary key)
   - username (VARCHAR(50), unique)
   - email (VARCHAR(255), unique)
   - password_hash (VARCHAR(255), nullable for OAuth users)
   - display_name (VARCHAR(100), nullable)
   - avatar_url (TEXT, nullable)
   - bio (TEXT, nullable)
   - email_verified (BOOLEAN, default false)
   - created_at, updated_at timestamps
   - Indexes on username and email

2. Define OAuthAccount model
   - id (UUID, primary key)
   - user_id (UUID, foreign key to users)
   - provider (VARCHAR(50): google, github, mastodon, bluesky)
   - provider_account_id (VARCHAR(255))
   - access_token (TEXT, nullable)
   - refresh_token (TEXT, nullable)
   - expires_at (TIMESTAMP, nullable)
   - provider_data (JSONB, nullable)
   - created_at, updated_at timestamps
   - Unique constraint on (provider, provider_account_id)
   - Indexes on user_id and provider

3. Define Session model
   - id (UUID, primary key)
   - user_id (UUID, foreign key to users)
   - token (VARCHAR(255), unique)
   - refresh_token (VARCHAR(255), unique, nullable)
   - expires_at (TIMESTAMP)
   - ip_address (VARCHAR(45), nullable)
   - user_agent (TEXT, nullable)
   - created_at, updated_at timestamps
   - Indexes on user_id, token, refresh_token, expires_at

4. Define EmailVerificationToken model
   - id (UUID, primary key)
   - user_id (UUID, foreign key to users)
   - token (VARCHAR(255), unique)
   - expires_at (TIMESTAMP)
   - created_at timestamp
   - Indexes on token and user_id

5. Define PasswordResetToken model
   - id (UUID, primary key)
   - user_id (UUID, foreign key to users)
   - token (VARCHAR(255), unique)
   - expires_at (TIMESTAMP)
   - created_at timestamp
   - Indexes on token and user_id

**Deliverables:**

- Complete Prisma schema with all authentication models
- Proper relationships and constraints
- Indexes for performance

---

### 2.1.2 Database Migration

**Tasks:**

1. Create initial migration

   ```bash
   npx prisma migrate dev --name init_auth
   ```

2. Verify migration files created
3. Test migration on local database
4. Generate Prisma Client
   ```bash
   npx prisma generate
   ```

**Deliverables:**

- Migration files in `prisma/migrations/`
- Prisma Client generated
- Database tables created

---

## Section 2.2: Authentication Backend (Serverless Functions)

### 2.2.1 Authentication Utilities

**Tasks:**

1. Create password hashing utility (`lib/auth/password.ts`)
   - `hashPassword()` - Hash password with bcrypt
   - `verifyPassword()` - Verify password against hash
   - `validatePasswordStrength()` - Validate password requirements

2. Create JWT utilities (`lib/auth/jwt.ts`)
   - `generateAccessToken()` - Generate short-lived access token
   - `generateRefreshToken()` - Generate long-lived refresh token
   - `generateTokenPair()` - Generate both tokens
   - `verifyAccessToken()` - Verify and decode access token
   - `verifyRefreshToken()` - Verify and decode refresh token
   - `generateRandomToken()` - Generate random token for email/password reset
   - `getExpirationDate()` - Calculate expiration dates

3. Create authentication middleware (`lib/auth/middleware.ts`)
   - `withAuth()` - Higher-order function for protected routes
   - `getUserFromRequest()` - Extract user from request

4. Create validation utilities (`lib/auth/validation.ts`)
   - `validateEmail()` - Validate email format
   - `validateUsername()` - Validate username format
   - `validateRegistrationInput()` - Validate registration data

**Deliverables:**

- Password hashing utilities
- JWT token management utilities
- Authentication middleware
- Input validation utilities

---

### 2.2.2 API Route Structure

**Tasks:**

1. Create API route directories

   ```
   app/api/auth/
   ├── register/
   ├── login/
   ├── refresh/
   ├── logout/
   ├── verify-email/
   ├── reset-password/
   ├── profile/
   └── oauth/
   ```

2. Set up route handlers with proper TypeScript types

**Deliverables:**

- API route structure created
- Route handlers scaffolded

---

### 2.2.3 Authentication Endpoints

**Tasks:**

1. Implement `POST /api/auth/register`
   - Validate input (username, email, password)
   - Check username/email uniqueness
   - Hash password
   - Create user record
   - Generate email verification token
   - Return user data and verification token (dev mode)

2. Implement `POST /api/auth/login`
   - Validate credentials
   - Find user by email or username
   - Verify password
   - Generate JWT tokens
   - Create session record
   - Return tokens and user data

3. Implement `POST /api/auth/refresh`
   - Validate refresh token
   - Check session exists and not expired
   - Generate new access token
   - Optionally rotate refresh token
   - Update session
   - Return new tokens

4. Implement `POST /api/auth/logout`
   - Validate access token
   - Delete session record
   - Return success

5. Implement `POST /api/auth/verify-email`
   - Validate verification token
   - Check token not expired
   - Update user email_verified
   - Delete verification token
   - Generate tokens for auto-login
   - Create session
   - Return tokens and user data

6. Implement `POST /api/auth/reset-password` (request)
   - Validate email
   - Find user
   - Generate reset token
   - Delete existing reset tokens
   - Create reset token record
   - Return success (don't reveal if user exists)

7. Implement `PUT /api/auth/reset-password` (confirm)
   - Validate token and new password
   - Check token not expired
   - Hash new password
   - Update user password
   - Delete reset token
   - Invalidate all user sessions

8. Implement `GET /api/auth/profile`
   - Protected route (requires auth)
   - Get user from token
   - Return user profile

9. Implement `PUT /api/auth/profile`
   - Protected route (requires auth)
   - Validate update data
   - Update user profile
   - Return updated user

**Deliverables:**

- All authentication endpoints implemented
- Proper error handling
- Input validation
- Security best practices

---

## Section 2.3: OAuth Integration

### 2.3.1 OAuth Provider Configuration

**Tasks:**

1. Create OAuth provider configuration (`lib/auth/oauth/providers.ts`)
   - Define OAuthProvider type
   - Define OAuthProviderConfig interface
   - Define OAuthUserInfo interface
   - `getOAuthConfig()` - Get provider config from env vars
   - `getOAuthAuthorizationUrl()` - Generate authorization URLs

2. Support providers:
   - Google OAuth
   - GitHub OAuth
   - Mastodon OAuth (ActivityPub)
   - Blue Sky OAuth (AT Protocol)

**Deliverables:**

- OAuth provider configuration
- Authorization URL generation

---

### 2.3.2 OAuth Routes

**Tasks:**

1. Implement `GET /api/auth/oauth/[provider]`
   - Get provider from params
   - Generate authorization URL
   - Redirect to provider

2. Implement `GET /api/auth/oauth/[provider]/callback`
   - Handle OAuth callback
   - Extract authorization code
   - Exchange code for tokens (placeholder)
   - Fetch user profile (placeholder)
   - Create/link OAuth account (placeholder)
   - Create session (placeholder)
   - Redirect to app

**Note**: Full OAuth token exchange implementation is deferred. Structure is in place for future completion.

**Deliverables:**

- OAuth route handlers
- Callback handler structure
- Placeholder for token exchange

---

## Section 2.4: Authentication Frontend

### 2.4.1 Auth Context Provider

**Tasks:**

1. Create AuthContext (`contexts/AuthContext.tsx`)
   - User state management
   - Loading state
   - `login()` - Login user
   - `register()` - Register user
   - `logout()` - Logout user
   - `refreshToken()` - Refresh access token
   - `updateProfile()` - Update user profile
   - `loadUser()` - Load user from token on mount
   - Automatic token refresh

2. Create `useAuth()` hook
   - Access auth context
   - Throw error if used outside provider

**Deliverables:**

- AuthContext provider
- useAuth hook
- Token management
- User state management

---

### 2.4.2 Authentication Components

**Tasks:**

1. Create LoginForm component (`components/auth/LoginForm.tsx`)
   - Email/username input
   - Password input
   - Error display
   - Loading state
   - Form submission handler

2. Create RegisterForm component (`components/auth/RegisterForm.tsx`)
   - Username input
   - Email input
   - Password input
   - Confirm password input
   - Password strength indicator
   - Error display
   - Loading state
   - Form submission handler

**Deliverables:**

- Login form component
- Registration form component
- Error handling
- Loading states

---

### 2.4.3 Integration

**Tasks:**

1. Integrate AuthProvider into app layout
   - Wrap app with AuthProvider
   - Ensure context available throughout app

2. Update types to match Prisma schema
   - User type
   - OAuthAccount type
   - Session type

**Deliverables:**

- AuthProvider integrated
- Types updated

---

## Phase 2 Completion Checklist

### Database Schema

- [x] Prisma schema with all auth models
- [ ] Database migration created and tested
- [ ] Prisma Client generated

### Backend

- [x] Password hashing utilities
- [x] JWT token utilities
- [x] Authentication middleware
- [x] Validation utilities
- [x] All API endpoints implemented
- [x] Error handling
- [x] Input validation

### OAuth

- [x] OAuth provider configuration
- [x] Authorization URL generation
- [x] OAuth route handlers
- [x] Callback handler structure
- [ ] Full token exchange (pending)

### Frontend

- [x] AuthContext provider
- [x] useAuth hook
- [x] LoginForm component
- [x] RegisterForm component
- [x] AuthProvider integrated

## Next Steps

1. **Database Setup**: Set up PostgreSQL database and run migrations
2. **Environment Variables**: Configure JWT secrets and OAuth credentials
3. **Testing**: Test all authentication flows
4. **OAuth Completion**: Complete OAuth token exchange implementation
5. **Email Service**: Integrate email service for verification and password reset
6. **Phase 3**: Proceed to Core Post Feed System

## Notes

- All authentication endpoints follow RESTful conventions
- Security best practices implemented (password hashing, token expiration, etc.)
- OAuth structure is extensible for additional providers
- Email service integration is pending (tokens returned in dev mode)
- Database migration requires database setup first
