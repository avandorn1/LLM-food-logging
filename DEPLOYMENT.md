# 🚀 Deployment Guide: Vercel + Supabase

## Prerequisites
- GitHub account
- Supabase account (free at [supabase.com](https://supabase.com))
- Vercel account (free at [vercel.com](https://vercel.com))
- OpenAI API key

## Step 1: Set up Supabase Database

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `nutri-ai-tracker`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you
5. Click "Create new project"

### 2. Get Database Connection String
1. In your Supabase dashboard, go to **Settings** → **Database**
2. Scroll down to "Connection string"
3. Copy the "URI" connection string
4. Replace `[YOUR-PASSWORD]` with your database password

### 3. Set up Database Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Run the following SQL to create the tables:

```sql
-- Create User table
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "email" TEXT UNIQUE,
    "age" INTEGER,
    "biologicalSex" TEXT,
    "height" INTEGER,
    "weight" INTEGER,
    "activityLevel" TEXT
);

-- Create Goal table
CREATE TABLE "Goal" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL UNIQUE,
    "targetCalories" INTEGER,
    "targetProtein" INTEGER,
    "targetCarbs" INTEGER,
    "targetFat" INTEGER,
    "macroSplit" TEXT,
    "goalSettings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create FoodLog table
CREATE TABLE "FoodLog" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" TIMESTAMP(3) NOT NULL,
    "item" TEXT NOT NULL,
    "mealType" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "calories" INTEGER,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "fiber" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX "FoodLog_userId_day_idx" ON "FoodLog"("userId", "day");

-- Insert default user
INSERT INTO "User" ("id", "name") VALUES (1, 'Default User');
```

## Step 2: Deploy to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### 3. Set Environment Variables
In Vercel project settings, add these environment variables:

- **DATABASE_URL**: Your Supabase connection string
- **OPENAI_API_KEY**: Your OpenAI API key

### 4. Deploy
Click "Deploy" and wait for the build to complete!

## Step 3: Test Your Deployment

1. Visit your Vercel URL
2. Try logging some food
3. Check that data is being saved to Supabase
4. Verify the logging streak feature works

## Troubleshooting

### Database Connection Issues
- Verify your DATABASE_URL is correct
- Check that your Supabase project is active
- Ensure the database schema was created properly

### API Errors
- Check Vercel function logs
- Verify environment variables are set correctly
- Test OpenAI API key separately

### Build Errors
- Check that all dependencies are in package.json
- Verify TypeScript compilation
- Check Vercel build logs

## Next Steps

- Set up a custom domain
- Add authentication
- Configure monitoring
- Set up backups

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
