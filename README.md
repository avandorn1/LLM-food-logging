# 🍎 Demo Forklift - AI Nutrition Tracker

An AI-powered nutrition tracking app built with Next.js, Prisma, and OpenAI. Track your meals, set goals, and get personalized insights with natural language processing.

## Features

- 🤖 **AI-Powered Logging**: Log meals using natural language
- 📊 **Smart Analytics**: Track calories, macros, and progress
- 🎯 **Goal Setting**: Set and monitor nutrition goals
- 🔥 **Logging Streaks**: Stay motivated with streak tracking
- 📈 **Progress Dashboard**: Visualize your nutrition journey
- 💬 **AI Chat**: Get nutrition advice and insights

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **AI**: OpenAI GPT-4
- **Charts**: Recharts
- **Deployment**: Vercel

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 🚀 Deployment

This app is deployed at: **https://demo-forklift.vercel.app**

The app is configured for deployment on Vercel with Supabase. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup instructions.

### Quick Deploy

1. **Set up Supabase**: Create a project and get your database URL
2. **Deploy to Vercel**: Connect your GitHub repo
3. **Configure Environment Variables**:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string
   - `OPENAI_API_KEY`: Your OpenAI API key

## 📝 Environment Variables

Copy `env.example` to `.env.local` and fill in your values:

```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
OPENAI_API_KEY="your-openai-api-key"
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
