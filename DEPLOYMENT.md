# PlegoHR - Local Development & Deployment Guide

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ installed
- Git installed
- VS Code (recommended)
- Supabase account (already configured)

### 1. Set Up Locally

```bash
# Navigate to project folder
cd plegahr

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit: http://localhost:5173

### 2. Environment Variables

Your `.env` file is already configured with Supabase credentials. Keep it safe and never commit it to git!

```env
VITE_SUPABASE_URL=https://pmfvcynpezyykjbanxcg.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

### 3. Daily Development Workflow

```bash
# Start dev server (with hot reload)
npm run dev

# Make changes in VS Code
# Browser automatically refreshes

# Before committing
npm run typecheck  # Check types
npm run build      # Test build

# Commit changes
git add .
git commit -m "Add feature X"
git push

# ✨ Auto-deploys to production!
```

---

## 🌐 Deploy to Production

### Option 1: Vercel (Recommended - 5 Minutes Setup)

**Why Vercel?**
- ✅ Free tier (100 GB bandwidth/month)
- ✅ Auto-deploy on git push
- ✅ Automatic HTTPS
- ✅ Best performance for React

**Steps:**

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login**
```bash
vercel login
```

3. **Deploy**
```bash
vercel
```

Follow prompts:
- Set up and deploy? **Yes**
- Which scope? Choose your account
- Link to existing project? **No**
- Project name? **plegahr**
- In which directory is your code? **./`
- Want to override settings? **No**

4. **Set Environment Variables** in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add these variables:
     - `VITE_SUPABASE_URL` = `https://pmfvcynpezyykjbanxcg.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = (your anon key from .env)
     - `VITE_APP_URL` = `https://your-app.vercel.app` (your production URL)

5. **Connect to GitHub (for auto-deploy)**
```bash
# On Vercel Dashboard: Settings → Git → Connect Repository
```

Now every push to `main` deploys automatically! 🎉

## Step 2: Update Supabase Configuration

Once you have your production URL (e.g., `https://your-app.vercel.app`):

1. **Update Site URL in Supabase**:
   - Go to Supabase Dashboard
   - Navigate to **Authentication** → **URL Configuration**
   - Set **Site URL** to your production URL
   - Add your production URL to **Redirect URLs**

2. **Update Email Template**:
   - Go to **Authentication** → **Email Templates**
   - Select **"Invite user"** template
   - Use this custom template:

```html
<h2>You've been invited to join PlegoHR</h2>

<p>Hi there,</p>

<p>You have been invited to join <strong>{{ .Data.company_name }}</strong> on PlegoHR.</p>

<p>Click the link below to accept your invitation and set up your account:</p>

<p><a href="{{ .Data.invitation_url }}" style="display: inline-block; padding: 12px 24px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Accept Invitation</a></p>

<p>Or copy and paste this URL into your browser:</p>
<p style="color: #6b7280; font-size: 14px; word-break: break-all;">{{ .Data.invitation_url }}</p>

<p style="margin-top: 24px; color: #6b7280; font-size: 14px;">This invitation will expire in 7 days.</p>

<p style="color: #6b7280; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>

<p style="margin-top: 32px;">Best regards,<br>The PlegoHR Team</p>
```

## Step 3: Update Production Environment Variable

After deploying, update your `.env` file locally with your production URL:

```
VITE_APP_URL=https://your-app.vercel.app
```

---

## 📦 How to Get This Project Locally

### Method 1: Download Files Directly

Copy all project files from this environment to your local machine:
- All files in `/tmp/cc-agent/60520207/project/`
- **Important:** Keep the `.env` file with your Supabase credentials

### Method 2: Create Git Repository

```bash
# In your local project folder
git init
git add .
git commit -m "Initial commit - PlegoHR"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/plegahr.git
git branch -M main
git push -u origin main
```

---

## 🛠️ VS Code Recommended Extensions

Install these for the best development experience:

- **ESLint** - JavaScript linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **ES7+ React/Redux/React-Native snippets** - React shortcuts
- **GitLens** - Git superpowers
- **Error Lens** - Inline error messages

---

## 🔄 Alternative Hosting Options

### Option 2: Netlify

**Steps:**

1. **Install Netlify CLI**
```bash
npm i -g netlify-cli
```

2. **Login**
```bash
netlify login
```

3. **Create `netlify.toml` config**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

4. **Deploy**
```bash
netlify deploy --prod
```

5. **Set Environment Variables**
```bash
netlify env:set VITE_SUPABASE_URL "your_url"
netlify env:set VITE_SUPABASE_ANON_KEY "your_key"
```

6. **Link to GitHub for auto-deploy**
- Netlify Dashboard → Site Settings → Build & Deploy
- Connect your GitHub repository

### Option 3: GitHub Pages (Free)

**Create `.github/workflows/deploy.yml`:**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Add secrets to GitHub:**
- Repository → Settings → Secrets and variables → Actions
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Enable GitHub Pages:**
- Repository → Settings → Pages
- Source: GitHub Actions

## Testing Your Deployment

1. Visit your production URL
2. Sign up and create a company
3. Add an employee
4. Check that the invitation email contains the correct production URL
5. Accept the invitation using the link in the email

---

## 🐛 Troubleshooting

### Build Fails Locally

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Environment Variables Not Working

Make sure they start with `VITE_`:
- ✅ `VITE_SUPABASE_URL`
- ❌ `SUPABASE_URL` (won't work)

### Routing Issues (404 on refresh)

**Vercel:** Add `vercel.json` at root:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Netlify:** Already handled by `netlify.toml`

### Supabase Connection Fails

1. Check `.env` file has correct credentials
2. Verify Supabase project is active (check dashboard)
3. Test connection:
```typescript
// In browser console
console.log(import.meta.env.VITE_SUPABASE_URL);
```

### TypeScript Errors

```bash
npm run typecheck  # Find all type errors
```

---

## 🔐 Security Checklist

Before going live:

- [ ] ✅ `.env` file in `.gitignore` (already done)
- [ ] ✅ Environment variables set on hosting platform
- [ ] ✅ RLS enabled on all Supabase tables (already done)
- [ ] ✅ File upload validation (already done)
- [ ] ✅ HTTPS enabled (automatic on Vercel/Netlify)
- [ ] ⚠️ Set custom domain (optional, recommended for production)
- [ ] ⚠️ Configure Supabase email templates with your domain
- [ ] ⚠️ Set up error monitoring (Sentry recommended)

---

## 📊 Post-Deployment Checklist

After deploying, verify:

- [ ] App loads at production URL
- [ ] Login/Signup works
- [ ] Database queries work
- [ ] File uploads to Supabase Storage work
- [ ] All pages render correctly
- [ ] Mobile responsive design works
- [ ] Email invitations send correctly
- [ ] All translations (EN/ES/CA) work

---

## 💰 Cost Summary

**Development (Local):**
- Cost: **$0**
- Everything runs on your machine

**Hosting (Production):**
- Vercel/Netlify Free Tier: **$0/month**
- 100 GB bandwidth
- Automatic HTTPS
- Custom domain support

**Database (Supabase):**
- Free Tier: **$0/month** (up to 500 MB database, 1 GB storage)
- Pro Tier: **$25/month** (8 GB database, 100 GB storage)
- Upgrade when you hit limits

**Total Monthly Cost:**
- First 5-10 companies: **$0**
- Growing (10-100 companies): **$25**
- Scaling (100-1000 companies): **$25-50**

---

## 📈 Scaling Timeline

### Phase 1: Testing (Free)
- 1-10 companies
- Supabase Free + Vercel Free
- **Cost: $0/month**

### Phase 2: Launch ($25/month)
- 10-100 companies
- Supabase Pro + Vercel Free
- **Cost: $25/month**
- Revenue: ~$1,000-10,000/month
- **Profit: $975-9,975/month**

### Phase 3: Growth ($25-50/month)
- 100-1,000 companies
- Supabase Pro + Vercel Pro (if needed)
- **Cost: $25-50/month**
- Revenue: ~$10,000-100,000/month
- **Profit: $9,950-99,975/month**

### Phase 4: Scale ($599+/month)
- 1,000+ companies
- Supabase Team + Vercel Pro
- **Cost: $599+/month**
- Revenue: $100,000+/month
- **Profit: $99,401+/month**

---

## 🎉 You're All Set!

### Your Complete Tech Stack:

**Frontend:**
- ✅ React 18 + TypeScript
- ✅ Vite (fast dev server & build)
- ✅ Tailwind CSS + Material-UI
- ✅ i18n (English, Spanish, Catalan)
- ✅ React Router for navigation

**Backend:**
- ✅ Supabase (PostgreSQL database)
- ✅ Supabase Auth (email/password)
- ✅ Supabase Storage (file uploads)
- ✅ Edge Functions (serverless)
- ✅ Row Level Security (RLS)

**DevOps:**
- ✅ Git version control
- ✅ Auto-deploy on push
- ✅ Free hosting (Vercel/Netlify)
- ✅ Automatic HTTPS
- ✅ Environment variables management

### Your Development Workflow:

```bash
# Every day
npm run dev           # Start local server
# ... make changes in VS Code ...
git add .
git commit -m "..."
git push              # Auto-deploys!
```

---

## 📞 Need Help?

### Supabase
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com

### Vercel
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord

### Netlify
- Docs: https://docs.netlify.com
- Support: https://www.netlify.com/support

---

## Important Notes

- Always set `VITE_APP_URL` to your production domain in production
- The app will fallback to `window.location.origin` if `VITE_APP_URL` is not set
- Make sure to redeploy after updating environment variables
- Keep your Supabase keys secure and never commit them to version control
- Database is already fully configured with tables, RLS, and storage
- All you need to do is copy the code and deploy!

**Next Steps:**
1. Copy this project to your local machine
2. Run `npm install` and `npm run dev`
3. Deploy to Vercel (5 minutes)
4. Start building features!
5. Get your first customers! 🚀

Good luck with PlegoHR! 💼
