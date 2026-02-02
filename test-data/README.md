# Test Data Accounts

This directory contains test account profiles and a script to seed them into the localhost development database.

## Overview

The `test-accounts.json` file contains 41 test user accounts with realistic profiles, each associated with an image in this directory. These accounts are designed for local development and testing purposes.

## Test Accounts

Each test account includes:
- **Username**: Unique identifier (e.g., `acct00001`)
- **Email**: Realistic fake email address
- **Display Name**: Full name
- **Bio**: Short professional bio
- **Avatar**: GitHub raw URL pointing to the corresponding image
- **Password**: Default test password (see below)
- **Email Verified**: Set to `true` for easy testing

## Default Credentials

All test accounts use the same default password for convenience:

```
Password: TestAccount123!
```

All accounts are pre-verified (emailVerified: true) so you can log in immediately without email verification.

## Usage

### Prerequisites

1. Ensure your database is set up and migrations have been run
2. Make sure `.env.local` contains a valid `DATABASE_URL`
3. Ensure the database is accessible from localhost

### Seeding Test Accounts

Run the seed script using npm:

```bash
npm run test-data:seed
```

Or run it directly with Node.js:

```bash
node test-data/seed-test-accounts.js
```

The script will:
- Load accounts from `test-accounts.json`
- Check for existing accounts (skips duplicates)
- Hash passwords using bcrypt
- Create accounts in the database
- Display a summary of created, skipped, and failed accounts

### Example Output

```
==========================================
Test Accounts Seeder
==========================================

ℹ Loading test accounts from test-accounts.json...
✓ Loaded 41 test accounts
ℹ Connecting to database...
✓ Database connection established

ℹ Processing 41 accounts...

[1/41] Processing acct00001...
  ✓ Created: Alex Martinez (alex.martinez@example.com)
[2/41] Processing acct00002...
  ✓ Created: Sarah Chen (sarah.chen@example.com)
...

==========================================
Summary
==========================================

✓ Created: 41 accounts
⚠ Skipped: 0 accounts (already exist)
✗ Errors: 0 accounts

==========================================
Default Password
==========================================
ℹ All test accounts use the password: TestAccount123!
ℹ All accounts are marked as email verified for easy testing.
```

## Account Profiles

The test accounts represent diverse professions and backgrounds:

- Software developers and engineers
- UX/UI designers
- Product managers
- Data scientists
- DevOps engineers
- Marketing professionals
- And more...

Each account has a unique username, email, and bio that matches their professional persona.

## Avatar URLs

All avatars use GitHub raw URLs in the format:

```
https://github.com/Adron/interlinedlist/blob/develop/test-data/acct00001.jpg?raw=true
```

These URLs point to the images in this directory, allowing the avatars to be displayed in the application.

## Customization

### Adding More Accounts

1. Edit `test-accounts.json` and add a new account object
2. Ensure the account has:
   - Unique `username` and `email`
   - Valid `avatar` URL pointing to an image in this directory
   - All required fields (see schema below)

### Modifying Existing Accounts

1. Edit `test-accounts.json` to update account details
2. Delete the account from the database (if it exists)
3. Re-run the seed script

### Changing Default Password

1. Edit `test-accounts.json` and update the `password` field for all accounts
2. Re-run the seed script (existing accounts will be skipped unless deleted first)

## Account Schema

Each account in `test-accounts.json` follows this structure:

```json
{
  "username": "acct00001",
  "email": "alex.martinez@example.com",
  "displayName": "Alex Martinez",
  "bio": "Full-stack developer passionate about building scalable web applications.",
  "avatar": "https://github.com/Adron/interlinedlist/blob/develop/test-data/acct00001.jpg?raw=true",
  "password": "TestAccount123!",
  "emailVerified": true
}
```

### Required Fields

- `username`: Unique identifier (must be unique in database)
- `email`: Email address (must be unique in database)
- `password`: Plain text password (will be hashed)

### Optional Fields

- `displayName`: Full name (defaults to username if not provided)
- `bio`: Professional bio
- `avatar`: URL to avatar image
- `emailVerified`: Boolean (defaults to true)

## Troubleshooting

### Database Connection Errors

If you see connection errors:
1. Verify `.env.local` exists and contains `DATABASE_URL`
2. Ensure PostgreSQL is running
3. Check that the database exists and migrations have been run

### Duplicate Account Errors

The script automatically skips accounts that already exist (by username or email). To recreate an account:
1. Delete it from the database first
2. Re-run the seed script

### Password Hashing Errors

If password hashing fails:
1. Ensure `bcryptjs` is installed: `npm install bcryptjs`
2. Check Node.js version compatibility

## Files

- `test-accounts.json`: JSON file containing all test account data
- `seed-test-accounts.js`: Node.js script to seed accounts into database
- `README.md`: This documentation file
- `acct*.jpg`: Image files used as avatars for test accounts

## Notes

- These accounts are for **development and testing only**
- Do not use these accounts in production
- The default password should be changed if deploying to any shared environment
- All accounts are pre-verified to skip email verification flow during testing
