# Environment Variables Reference

Complete reference for all environment variables used in InterlinedList.

## Required Variables

### Database

```env
DATABASE_URL="postgresql://user:password@host:5432/database"
```

- **Description**: PostgreSQL connection string
- **Format**: `postgresql://[user]:[password]@[host]:[port]/[database]`
- **Local**: Use Docker Compose connection string
- **Production**: Use TigerData connection string
- **Security**: Never commit to version control

### JWT Configuration

```env
JWT_SECRET="your-secret-key-here-change-in-production"
```

- **Description**: Secret key for signing JWT access tokens
- **Requirements**: 
  - Minimum 32 characters
  - Use cryptographically secure random string
  - Different from `JWT_REFRESH_SECRET`
- **Generation**: Use `openssl rand -base64 32`

```env
JWT_REFRESH_SECRET="your-refresh-secret-key-here-change-in-production"
```

- **Description**: Secret key for signing JWT refresh tokens
- **Requirements**: Same as `JWT_SECRET`, but must be different
- **Generation**: Use `openssl rand -base64 32`

```env
JWT_ACCESS_EXPIRES_IN="15m"
```

- **Description**: Access token expiration time
- **Format**: Number followed by unit (s, m, h, d)
- **Examples**: `15m`, `1h`, `30s`
- **Recommended**: `15m` (15 minutes)

```env
JWT_REFRESH_EXPIRES_IN="7d"
```

- **Description**: Refresh token expiration time
- **Format**: Same as `JWT_ACCESS_EXPIRES_IN`
- **Recommended**: `7d` (7 days)

### Application

```env
APP_URL="http://localhost:3000"
```

- **Description**: Base URL of the application
- **Local**: `http://localhost:3000`
- **Production**: `https://interlinedlist.com`
- **Usage**: Used for OAuth redirects and email links

```env
NODE_ENV="development"
```

- **Description**: Node.js environment
- **Values**: `development`, `production`, `test`
- **Default**: `development`
- **Production**: Must be set to `production`

## Optional Variables

### OAuth Providers

#### Google OAuth

```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

- **Setup**: Create OAuth credentials in Google Cloud Console
- **Redirect URI**: `{APP_URL}/api/auth/oauth/google/callback`

#### GitHub OAuth

```env
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

- **Setup**: Create OAuth App in GitHub Settings → Developer settings
- **Redirect URI**: `{APP_URL}/api/auth/oauth/github/callback`

#### Mastodon OAuth

```env
MASTODON_CLIENT_ID="your-mastodon-client-id"
MASTODON_CLIENT_SECRET="your-mastodon-client-secret"
MASTODON_INSTANCE_URL="https://your-instance.com"
```

- **Setup**: Register application on Mastodon instance
- **Redirect URI**: `{APP_URL}/api/auth/oauth/mastodon/callback`
- **Note**: Each Mastodon instance requires separate registration

#### Blue Sky OAuth

```env
BLUESKY_CLIENT_ID="your-bluesky-client-id"
BLUESKY_CLIENT_SECRET="your-bluesky-client-secret"
```

- **Setup**: Register application with Blue Sky
- **Status**: Placeholder - implementation pending

### Email Service (Future)

```env
EMAIL_SERVICE="sendgrid" # or "ses", "mailgun", etc.
EMAIL_API_KEY="your-email-api-key"
EMAIL_FROM="noreply@interlinedlist.com"
```

- **Status**: Not yet implemented
- **Purpose**: For sending verification and password reset emails

## Environment-Specific Configuration

### Development (.env.local)

```env
NODE_ENV=development
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://interlinedlist:password@localhost:5432/interlinedlist
JWT_SECRET=dev-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Production (Vercel Environment Variables)

```env
NODE_ENV=production
APP_URL=https://interlinedlist.com
DATABASE_URL=postgresql://user:password@tigerdata-host:5432/database
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<different-strong-random-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

## Security Best Practices

### Secret Management

1. **Never commit secrets to Git**
   - Use `.env.local` (already in `.gitignore`)
   - Use Vercel Environment Variables for production

2. **Use Strong Secrets**
   - Minimum 32 characters
   - Cryptographically random
   - Different for each environment

3. **Rotate Secrets Regularly**
   - Quarterly rotation recommended
   - Plan for zero-downtime rotation

4. **Limit Access**
   - Only necessary team members
   - Use environment-specific secrets
   - Audit access regularly

### Secret Generation

**Generate JWT Secrets:**
```bash
# Generate a secure random secret
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Validation

### Required Variables Check

Create a script to validate all required variables are set:

```typescript
// lib/env-validation.ts
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'APP_URL',
];

export function validateEnv() {
  const missing = requiredEnvVars.filter(
    (key) => !process.env[key]
  );
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}
```

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify `DATABASE_URL` format
- Check database is accessible
- Verify credentials are correct

**JWT Errors**
- Ensure secrets are set and different
- Check expiration times are valid format
- Verify secrets are strong enough

**OAuth Not Working**
- Verify redirect URIs match exactly
- Check client IDs and secrets
- Ensure `APP_URL` is correct

### Testing Environment Variables

```bash
# Check if variables are loaded (development)
node -e "require('dotenv').config({ path: '.env.local' }); console.log(process.env.DATABASE_URL)"

# Verify in Vercel
# Use Vercel CLI or dashboard to check environment variables
```

## Migration Between Environments

When moving from development to production:

1. Export development variables (for reference only)
2. Create production equivalents with production values
3. Update `APP_URL` to production domain
4. Use production database connection string
5. Generate new, strong secrets for production
6. Configure OAuth redirect URIs for production
7. Test all functionality in staging first

