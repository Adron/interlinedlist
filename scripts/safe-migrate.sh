#!/bin/bash

# Safe migration script for InterlinedList
# This script checks migration status and uses the appropriate Prisma command
# to prevent destructive database resets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

log_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Check if we're in the project root
if [ ! -f "prisma/schema.prisma" ]; then
  log_error "prisma/schema.prisma not found. Please run this script from the project root."
  exit 1
fi

log_info "Checking migration status..."

# Check migration status
MIGRATE_STATUS=$(npx prisma migrate status 2>&1 || true)

# Check if there are pending migrations to apply
if echo "$MIGRATE_STATUS" | grep -q "The following migration(s) have not yet been applied"; then
  log_warning "Found pending migrations that need to be applied."
  log_info "Using 'prisma migrate deploy' to safely apply migrations without resetting the database..."
  echo ""
  
  # Use migrate deploy to apply pending migrations safely
  if npx prisma migrate deploy; then
    log_success "Migrations applied successfully!"
    exit 0
  else
    log_error "Failed to apply migrations."
    exit 1
  fi
fi

# Check if there's a migration history mismatch
if echo "$MIGRATE_STATUS" | grep -q "Your local migration history and the migrations table from your database are different"; then
  log_warning "Migration history mismatch detected!"
  log_info "This can happen when:"
  log_info "  - Database has migrations not in your local folder"
  log_info "  - Local folder has migrations not in the database"
  echo ""
  log_info "Attempting to resolve by applying pending migrations..."
  echo ""
  
  # Try to apply pending migrations first
  if npx prisma migrate deploy; then
    log_success "Migrations applied successfully!"
    log_info "Migration history should now be in sync."
    exit 0
  else
    log_error "Could not automatically resolve migration mismatch."
    log_info ""
    log_info "Options:"
    log_info "  1. Use 'npm run db:migrate:deploy' to apply pending migrations"
    log_info "  2. Use 'npm run db:migrate:force' to create a new migration (may require manual resolution)"
    log_info "  3. Manually resolve by marking migrations as applied:"
    log_info "     npx prisma migrate resolve --applied <migration-name>"
    exit 1
  fi
fi

# Check if database is in sync
if echo "$MIGRATE_STATUS" | grep -q "Database schema is up to date"; then
  log_success "Database schema is up to date!"
  log_info "No migrations to apply."
  
  # Check if there are schema changes that need a new migration
  log_info "Checking for schema changes..."
  if npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script > /dev/null 2>&1; then
    log_info "No schema changes detected."
  else
    log_warning "Schema changes detected. Creating new migration..."
    echo ""
    npx prisma migrate dev --name "$(date +%Y%m%d%H%M%S)_schema_change"
    log_success "New migration created and applied!"
  fi
  exit 0
fi

# Default: use migrate dev for creating new migrations
log_info "Creating/updating migrations with 'prisma migrate dev'..."
echo ""

# Check if there are uncommitted schema changes
SCHEMA_DIFF=$(npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script 2>&1 || true)

if [ -z "$SCHEMA_DIFF" ] || echo "$SCHEMA_DIFF" | grep -q "No difference detected"; then
  log_info "No schema changes detected. Database is in sync."
  exit 0
fi

# Prompt for migration name if not provided
MIGRATION_NAME="${1:-$(date +%Y%m%d%H%M%S)_migration}"

log_info "Creating migration: $MIGRATION_NAME"
npx prisma migrate dev --name "$MIGRATION_NAME"

log_success "Migration completed successfully!"
