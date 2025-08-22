# 🔄 Data Migration Guide: Local SQLite → Supabase

This guide will help you migrate your local nutrition data to your live Supabase database.

## 📊 Your Current Data

Based on the export, you have:
- **1 user** (your profile)
- **1 goal** (your nutrition targets)
- **52 food logs** (your meal history)

## 🚀 Migration Steps

### Step 1: Set up Supabase Database

1. **Create Supabase Project** (if not done already):
   - Go to [supabase.com](https://supabase.com)
   - Create a new project called `nutri-ai-tracker`
   - Save your database password

2. **Get Connection String**:
   - In Supabase dashboard → Settings → Database
   - Copy the "URI" connection string
   - Replace `[YOUR-PASSWORD]` with your database password

3. **Set up Database Schema**:
   - Go to SQL Editor in Supabase
   - Run the SQL from `DEPLOYMENT.md` to create tables

### Step 2: Import Your Data

1. **Set Environment Variable**:
   ```bash
   # Set your Supabase connection string
   export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```

2. **Run Import Script**:
   ```bash
   node scripts/import-to-supabase.js
   ```

3. **Verify Import**:
   - Check Supabase dashboard → Table Editor
   - You should see your data in the tables

### Step 3: Update Vercel Environment

1. **Go to Vercel Dashboard**:
   - Find your deployed project
   - Go to Settings → Environment Variables

2. **Update DATABASE_URL**:
   - Replace the placeholder with your actual Supabase connection string
   - Redeploy the project

### Step 4: Test Your Live App

1. **Visit your Vercel URL**
2. **Check that your data appears**:
   - Food logs should show up
   - Goals should be set
   - Logging streak should calculate correctly

## 🔧 Troubleshooting

### Connection Issues
- Verify your Supabase project is active
- Check that the connection string is correct
- Ensure the database schema was created

### Import Errors
- Make sure the DATABASE_URL environment variable is set
- Check that the exported-data.json file exists
- Verify Supabase tables were created properly

### Data Not Showing
- Check Vercel environment variables
- Redeploy the project after updating variables
- Clear browser cache

## 📋 Quick Commands

```bash
# Export local data (already done)
node scripts/export-data.js

# Import to Supabase (after setting DATABASE_URL)
node scripts/import-to-supabase.js

# Check your data
cat exported-data.json
```

## 🎯 Expected Results

After migration, your live website should show:
- ✅ All 52 food logs
- ✅ Your nutrition goals
- ✅ Correct logging streak calculation
- ✅ Progress dashboard with historical data
- ✅ Charts and analytics

Your nutrition journey will continue seamlessly from local to live! 🚀
