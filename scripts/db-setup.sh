#!/bin/bash

# Database setup script for InterlinedList
# This script helps set up the local database using Docker

set -e

echo "🚀 Setting up InterlinedList database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install Docker Compose."
    exit 1
fi

# Start PostgreSQL container
echo "📦 Starting PostgreSQL container..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d postgres
else
    docker compose up -d postgres
fi

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if PostgreSQL is ready
until docker exec interlinedlist_db pg_isready -U interlinedlist > /dev/null 2>&1; do
    echo "⏳ Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "⚠️  Please update .env.local with your configuration"
fi

# Check if Prisma is installed
if ! command -v npx &> /dev/null; then
    echo "❌ npx is not available. Please install Node.js."
    exit 1
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate dev --name init_auth

echo "✅ Database setup complete!"
echo ""
echo "📊 You can now:"
echo "   - View database: npx prisma studio"
echo "   - Run migrations: npx prisma migrate dev"
echo "   - Stop database: docker-compose down"
echo "   - Start database: docker-compose up -d"

