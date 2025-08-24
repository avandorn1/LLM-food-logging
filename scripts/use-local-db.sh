#!/bin/bash

# Switch to local SQLite database for development
echo "Switching to local SQLite database..."

# Copy local schema to main schema
cp prisma/schema.local.prisma prisma/schema.prisma

# Generate Prisma client
npx prisma generate

# Create and migrate database
npx prisma db push

echo "✅ Switched to local SQLite database"
echo "You can now run 'npm run dev' to test UI changes locally"
echo "Database operations will work locally but won't affect the deployed version"
