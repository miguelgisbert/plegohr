# PlegoHR - Modern HR Management System

A comprehensive HR management platform built with React, TypeScript, Supabase, and Tailwind CSS.

> **🚀 Quick Start**: Read [`QUICK_START.md`](./QUICK_START.md) first - it has everything you need to get running in 15 minutes!

## ⚡ Project Status

✅ **Authentication System** - Complete (login, signup, password reset)
✅ **Role-Based Access Control** - Complete (admin & employee roles)
✅ **Password Reset Feature** - Complete (forgot password via email)
⏳ **Supabase Setup** - Pending (create tables from migrations)
⏳ **Time Tracking** - In Progress (UI ready, DB integration pending)
⏳ **Documents Management** - Pending
⏳ **Leave Requests** - Pending

## Features

### ✅ Implemented
- 🔐 Email/Password Authentication
- 🔑 OAuth (Google & LinkedIn)
- 📧 Password Reset via Email (Forgot Password)
- 👥 Employee Invitation System
- 🔑 Role-Based Access Control (Admin & Employee)
- 🕐 Time Tracking Interface (UI ready)
- 🌓 Dark Mode Support
- 🌍 Multi-language (English, Spanish, Catalan)
- 📱 Responsive Design
- 🔒 Row Level Security (RLS) Policies

### ⏳ Pending
- 📊 Time Entries Database Integration
- 📄 Document Management
- 🏖️ Leave Request System
- 📈 Reports & Analytics

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Routing**: React Router v6
- **Icons**: Lucide React
- **i18n**: react-i18next
- **State**: React Context API

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier available)

- A Supabase account (free tier available)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/plegohr.git
cd plegohr
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy your project URL and anon key

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Run Database Migrations

The migrations are located in `supabase/migrations/`. You have two options:

**Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

**Option B: Manual Migration via Supabase Dashboard**

1. Go to your Supabase project → SQL Editor
2. Run each migration file in order (they're timestamped):
   - `20251121150408_create_initial_schema.sql`
   - `20251201130342_fix_infinite_recursion_rls_policies.sql`
   - `20251201221513_add_employee_invitations.sql`
   - `20251202170826_create_documents_table.sql`
   - `20251202171135_create_documents_storage_bucket.sql`
   - `20251202172056_create_leave_requests_table.sql`

### 6. Deploy Edge Function (Optional - for email invitations)

```bash
# Deploy the invitation function
supabase functions deploy send-employee-invitation
```

### Backend Workflow (Recommended)

For this repository, use the dedicated guide:

- `SUPABASE_WORKFLOW.md`

It includes:

- Supabase CLI installation on Windows
- project linking
- migration execution
- Edge Function deployment
- frontend vs backend deployment responsibilities

### 7. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

## Database Schema

### Core Tables

- **profiles** - User profiles (linked to Supabase auth.users)
- **companies** - Company information
- **employees** - Employee records
- **employee_invitations** - Pending employee invitations
- **leave_types** - Customizable leave categories
- **leave_requests** - Employee leave requests
- **documents** - Document metadata

### Storage Buckets

- **documents** - Secure file storage for employee documents

## Deployment

### Recommended: Free Deployment Options

#### 1. **Vercel** (Recommended - Best for this stack)

**Why Vercel:**

- ✅ **Completely free** for personal/small projects
- ✅ Automatic deployments from GitHub
- ✅ Built-in CI/CD
- ✅ Global CDN
- ✅ Automatic HTTPS
- ✅ Perfect for Vite/React apps
- ✅ Can scale to paid plans easily

**Deploy to Vercel:**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow the prompts and add your environment variables
```

Or use the Vercel GitHub integration:

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Import Project"
4. Select your PlegoHR repository
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy!

**Free Tier Includes:**

- Unlimited deployments
- Automatic HTTPS
- 100GB bandwidth/month
- Global CDN

---

#### 2. **Netlify** (Great Alternative)

**Why Netlify:**

- ✅ Free tier is generous
- ✅ Easy to use
- ✅ GitHub integration
- ✅ Forms & serverless functions

**Deploy to Netlify:**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build your app
npm run build

# Deploy
netlify deploy --prod

# Or connect via GitHub at netlify.com
```

**Free Tier Includes:**

- 100GB bandwidth/month
- 300 build minutes/month
- Automatic HTTPS

---

#### 3. **Cloudflare Pages** (Fastest Global Performance)

**Why Cloudflare:**

- ✅ Completely free (no credit card needed)
- ✅ Unlimited bandwidth
- ✅ Fastest global CDN
- ✅ GitHub integration

**Deploy to Cloudflare Pages:**

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect your GitHub account
3. Select your repository
4. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Add environment variables
6. Deploy!

**Free Tier Includes:**

- Unlimited bandwidth
- Unlimited requests
- 500 builds/month

---

### Database: Supabase (Already Configured)

**Why Supabase:**

- ✅ **Free tier is VERY generous**
- ✅ PostgreSQL database
- ✅ Built-in authentication
- ✅ File storage
- ✅ Real-time subscriptions
- ✅ Row Level Security
- ✅ API auto-generated

**Free Tier Includes:**

- 500MB database space
- 1GB file storage
- 2GB bandwidth
- 50,000 monthly active users
- Unlimited API requests

**When to Upgrade:**

- Pro Plan ($25/month):
  - 8GB database
  - 100GB file storage
  - 250GB bandwidth
  - No pausing after inactivity
  - Daily backups

---

## Recommended Architecture for Your Business

### Free Tier (Start Here)

```
Frontend:  Vercel (Free)
Database:  Supabase (Free)
Storage:   Supabase Storage (Free)
Auth:      Supabase Auth (Free)
```

**This gives you:**

- Professional domain (yourapp.vercel.app)
- HTTPS
- Global CDN
- 50,000 users/month capacity
- ~$0/month

### Growth Phase (When you exceed free limits)

```
Frontend:  Vercel Pro ($20/month)
Database:  Supabase Pro ($25/month)
Domain:    Custom domain ($12/year)
```

**Cost: ~$45/month + domain**

### Scale Phase (Real business growth)

```
Frontend:  Vercel ($20-$150/month depending on traffic)
Database:  Supabase Team ($599/month) or Enterprise
Email:     SendGrid/Postmark ($10-100/month)
Analytics: Plausible/PostHog ($9-$20/month)
```

---

## Environment Variables

### Development (.env)

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Production (Set in Vercel/Netlify/Cloudflare)

Same variables, but set in your hosting platform's dashboard.

---

## GitHub Setup

### Push Your Code

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/plegohr.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Clone Locally

Anyone can clone your project:

```bash
git clone https://github.com/YOUR_USERNAME/plegohr.git
cd plegohr
npm install
# Create .env file with your Supabase credentials
npm run dev
```

---

## Development Workflow

### Local Development

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # Check TypeScript types
```

### Database Changes

1. Create a new migration file in `supabase/migrations/`
2. Name it with timestamp: `YYYYMMDDHHMMSS_description.sql`
3. Test locally with Supabase CLI
4. Push changes: `supabase db push`
5. Commit the migration file to Git

### Deployment

With Vercel/Netlify/Cloudflare connected to GitHub:

- Just push to `main` branch
- Automatic deployment happens
- Preview deployments for PRs

---

## Security Notes

### Never Commit:

- `.env` file (already in `.gitignore`)
- Supabase service role key
- API keys
- Passwords

### Row Level Security (RLS)

All database tables have RLS enabled. Users can only:

- View their own company's data
- Modify their own records
- Access files they own

### Best Practices

- Keep Supabase packages updated
- Review RLS policies regularly
- Use environment variables for all secrets
- Enable 2FA on your Supabase account
- Regular backups (automatic on paid Supabase plans)

---

## Troubleshooting

### Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database Connection Issues

- Verify environment variables are set
- Check Supabase project is active (free tier pauses after inactivity)
- Verify API keys are correct

### Migration Errors

- Run migrations in order (they're timestamped)
- Check for syntax errors in SQL
- Verify you have the right permissions

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

This project is private and proprietary.

---

## Support

For questions or issues, please open a GitHub issue or contact the development team.

---

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Payroll integration
- [ ] Time tracking
- [ ] Performance reviews
- [ ] Onboarding workflows
- [ ] Benefits management

---

## Built With Love ❤️

PlegoHR - Making HR management simple and efficient.
