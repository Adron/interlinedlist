#!/bin/bash

# Database setup script for InterlinedList
# This script creates the database user, database, and runs migrations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration (from .env.local)
DB_USER="interlinedlist"
DB_PASSWORD="interlinedlist_dev_password"
DB_NAME="interlinedlist"
DB_HOST="localhost"
DB_PORT="5432"

# Function to log success
log_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Function to log error
log_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Function to log warning
log_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to log info
log_info() {
  echo -e "${NC}ℹ $1${NC}"
}

echo "=========================================="
echo "InterlinedList Database Setup"
echo "=========================================="
echo ""

# Check if PostgreSQL is running
log_info "Checking PostgreSQL connection..."
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" > /dev/null 2>&1; then
  log_error "PostgreSQL is not running on $DB_HOST:$DB_PORT"
  log_info "Please start PostgreSQL and try again"
  exit 1
fi
log_success "PostgreSQL is running"

# Check if we can connect as postgres superuser (needed to create user/database)
log_info "Checking PostgreSQL superuser access..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
  log_success "Can connect as postgres superuser"
  USE_SUPERUSER=true
  ADMIN_USER="postgres"
else
  log_warning "Cannot connect as 'postgres' user. Trying current user..."
  CURRENT_USER=$(whoami)
  log_info "Attempting to connect as user: $CURRENT_USER"
  
  # Try to create user and database with current user
  if psql -h "$DB_HOST" -p "$DB_PORT" -U "$CURRENT_USER" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "Can connect as $CURRENT_USER"
    USE_SUPERUSER=false
    ADMIN_USER="$CURRENT_USER"
  else
    log_error "Cannot connect to PostgreSQL. Please ensure PostgreSQL is running and accessible."
    log_info "You may need to:"
    log_info "  1. Start PostgreSQL (e.g., Postgres.app on macOS)"
    log_info "  2. Ensure you have access to create databases"
    log_info "  3. Or manually create the user and database:"
    echo ""
    echo "  CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    echo "  CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    echo "  GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    echo "  ALTER USER $DB_USER CREATEDB;"
    exit 1
  fi
fi

# Create database user if it doesn't exist
log_info "Checking if database user '$DB_USER' exists..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  log_success "Database user '$DB_USER' already exists"
else
  log_info "Creating database user '$DB_USER'..."
  if [ "$USE_SUPERUSER" = true ]; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -d postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" > /dev/null 2>&1
    log_success "Created database user '$DB_USER'"
  else
    # Try to create user (may fail if not superuser)
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -d postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" > /dev/null 2>&1; then
      log_success "Created database user '$DB_USER'"
    else
      log_warning "Could not create user '$DB_USER' (may need superuser privileges)"
      log_info "You can create it manually with:"
      echo "  CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
      exit 1
    fi
  fi
fi

# Grant CREATEDB permission (needed for Prisma shadow database)
log_info "Granting CREATEDB permission to '$DB_USER'..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -d postgres -c "ALTER USER $DB_USER CREATEDB;" > /dev/null 2>&1 || log_warning "Could not grant CREATEDB (may already be granted)"
log_success "CREATEDB permission granted"

# Create database if it doesn't exist
log_info "Checking if database '$DB_NAME' exists..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
  log_success "Database '$DB_NAME' already exists"
else
  log_info "Creating database '$DB_NAME'..."
  if [ "$USE_SUPERUSER" = true ]; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" > /dev/null 2>&1
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" > /dev/null 2>&1
    log_success "Created database '$DB_NAME'"
  else
    # Try to create database
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" > /dev/null 2>&1; then
      log_success "Created database '$DB_NAME'"
      psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" > /dev/null 2>&1 || true
    else
      log_warning "Could not create database '$DB_NAME' (may need superuser privileges)"
      log_info "You can create it manually with:"
      echo "  CREATE DATABASE $DB_NAME OWNER $DB_USER;"
      echo "  GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
      exit 1
    fi
  fi
fi

# Grant schema permissions (important for Prisma)
log_info "Granting schema permissions..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -d "$DB_NAME" <<EOF > /dev/null 2>&1 || true
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF
log_success "Granted schema permissions"

# Load DATABASE_URL from .env.local for Prisma
log_info "Loading DATABASE_URL from .env.local..."
if [ -f .env.local ]; then
  export $(grep DATABASE_URL .env.local | sed 's/^/export /' | xargs)
  log_success "DATABASE_URL loaded"
else
  log_error ".env.local file not found"
  log_info "Please ensure .env.local exists with DATABASE_URL set"
  exit 1
fi

echo ""
log_info "Running Prisma migrations..."
if npm run db:migrate; then
  log_success "Prisma migrations completed"
else
  log_error "Prisma migrations failed"
  exit 1
fi

echo ""
log_success "Database setup complete!"
log_info "Database: $DB_NAME"
log_info "User: $DB_USER"
log_info "Connection: postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"
