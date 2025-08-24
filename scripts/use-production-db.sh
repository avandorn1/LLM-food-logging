#!/bin/bash

# Switch back to production Supabase database
echo "Switching to production Supabase database..."

# Copy production schema to main schema
cp prisma/schema.production.prisma prisma/schema.prisma

# Generate Prisma client
npx prisma generate

echo "✅ Switched to production Supabase database"
echo "Ready for deployment"
