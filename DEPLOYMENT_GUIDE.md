# Deployment Guide - PlegoHR

## Pre-Deployment Checklist

### Code Quality
- [ ] `npm run build` executes successfully
- [ ] `npm run lint` passes (if configured)
- [ ] No console errors or warnings
- [ ] All tests pass
- [ ] No hardcoded secrets in code
- [ ] No TODO comments left

### Security
- [ ] `.env.local` is in `.gitignore`
- [ ] `.env.local` is NOT committed
- [ ] Supabase RLS policies reviewed
- [ ] No sensitive data in comments
- [ ] CORS configured correctly

### Functionality
- [ ] Login/Signup works
- [ ] Admin can create company
- [ ] Admin can invite employees
- [ ] Employees can accept invitations
- [ ] Role-based access control verified
- [ ] All protected routes tested

### Database
- [ ] All migrations applied successfully
- [ ] RLS policies enabled on all tables
- [ ] No broken foreign keys
- [ ] Indexes created for performance
- [ ] Backup created before deployment

## Environment Configuration

### Production Environment Variables

Create `.env.production` (or configure in hosting platform):

```env
VITE_SUPABASE_URL=https://[PRODUCTION_PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[PRODUCTION_ANON_KEY]
```

**Important**: Use PRODUCTION Supabase project, not development!

### Obtaining Supabase Keys

1. Login to Supabase dashboard
2. Select your project
3. Settings → API
4. Copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

## Build for Production

```bash
# Clean previous builds
rm -rf dist/

# Install dependencies (if needed)
npm install

# Build
npm run build

# Preview build (optional, local testing)
npm run preview
```

**Output**: `dist/` folder ready for deployment

## Deployment Options

### Option 1: Vercel (Recommended for React/Vite)

**Advantages**:
- Free tier available
- Automatic deployments from Git
- Built-in optimization
- Easy environment variables

**Steps**:

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Import repository `miguelgisbert/plegohr`

2. **Configure Project**
   ```
   Framework: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

3. **Add Environment Variables**
   - Go to Settings → Environment Variables
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Select environments: Production, Preview, Development

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Access at `https://[project-name].vercel.app`

5. **Automatic Deployments**
   - Every push to `main` triggers deploy
   - Preview deployments for PRs

### Option 2: Netlify

**Advantages**:
- Free tier
- Git integration
- Serverless functions support
- CDN included

**Steps**:

1. **Connect Repository**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect GitHub
   - Select repository

2. **Configure Build**
   ```
   Build command: npm run build
   Publish directory: dist
   ```

3. **Add Environment Variables**
   - Site settings → Build & deploy → Environment
   - Add environment variables

4. **Deploy**
   - Netlify builds and deploys automatically

### Option 3: Traditional Hosting (Nginx/Apache)

**Requirements**:
- Static file hosting
- SSL certificate
- Node.js not required (built HTML/JS)

**Steps**:

1. **Build locally**
   ```bash
   npm run build
   ```

2. **Upload `dist/` folder to server**
   ```bash
   scp -r dist/* user@server:/var/www/plegohr/
   ```

3. **Configure Nginx**
   ```nginx
   server {
     listen 80;
     server_name plegohr.com;
     
     # Redirect HTTP to HTTPS
     return 301 https://$server_name$request_uri;
   }
   
   server {
     listen 443 ssl;
     server_name plegohr.com;
     
     ssl_certificate /path/to/cert.pem;
     ssl_certificate_key /path/to/key.pem;
     
     root /var/www/plegohr;
     index index.html;
     
     # Important: Redirect all 404s to index.html for React Router
     location / {
       try_files $uri $uri/ /index.html;
     }
     
     # Cache static assets
     location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
     }
     
     # Don't cache index.html
     location = /index.html {
       expires -1;
     }
   }
   ```

4. **Enable HTTPS (Let's Encrypt)**
   ```bash
   sudo certbot certonly --nginx -d plegohr.com
   ```

## Post-Deployment Verification

### Smoke Tests
- [ ] App loads at domain
- [ ] Landing page displays correctly
- [ ] Can navigate to login
- [ ] Can navigate to signup
- [ ] Can signup as new admin
- [ ] Can login with admin credentials
- [ ] Dashboard loads
- [ ] Can invite employees
- [ ] Employee can accept invitation
- [ ] Employee can login
- [ ] Employee dashboard loads

### Performance Checks
```bash
# Check performance metrics
- Lighthouse score (Chrome DevTools)
  - Performance: > 80
  - Accessibility: > 90
  - Best Practices: > 90
  - SEO: > 80

- Core Web Vitals
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1
```

### Security Checks
- [ ] HTTPS enabled and enforced
- [ ] Security headers present
  ```
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Strict-Transport-Security: max-age=31536000
  ```
- [ ] CORS properly configured
- [ ] Environment variables not exposed
- [ ] No sensitive data in source maps

### Monitoring Setup

**Error Tracking** (Optional):
```bash
# Using Sentry
npm install @sentry/react

# Configure in main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production",
});
```

**Analytics** (Optional):
```bash
# Using Google Analytics
npm install react-ga4

# Configure in main.tsx
import ReactGA from "react-ga4";
ReactGA.initialize("GA_MEASUREMENT_ID");
```

## Supabase Production Configuration

### Enable Backups
1. Supabase Dashboard
2. Settings → Backups
3. Enable automated backups
4. Set retention period

### Configure Authentication
1. Settings → Authentication
2. Set allowed redirect URLs:
   ```
   https://plegohr.com
   https://plegohr.com/login
   https://plegohr.com/accept-invitation
   ```
3. Configure email templates (if needed)

### Setup Email Notifications
1. Settings → Email Templates
2. Customize invitation email
3. Add company branding

### Monitor Database
1. Set up slow query logs
2. Monitor connection limits
3. Set up alerts for high resource usage

## Rollback Plan

If deployment fails:

```bash
# Revert to previous version
git revert HEAD
npm run build
# Deploy again

# Or rollback directly from hosting platform
# (e.g., Vercel/Netlify has automatic rollback)
```

## Continuous Deployment

### GitHub Actions (Automatic Testing & Deployment)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Monitoring & Maintenance

### Daily Checks
- [ ] App is accessible
- [ ] No error spikes in monitoring
- [ ] Database response times normal

### Weekly Checks
- [ ] Review logs for errors
- [ ] Check backup status
- [ ] Monitor storage usage

### Monthly Checks
- [ ] Review performance metrics
- [ ] Update dependencies (security patches)
- [ ] Review RLS policies
- [ ] Clean up unused data

## Troubleshooting

### Deployment Fails
1. Check build logs
2. Verify environment variables
3. Ensure all migrations ran
4. Check Supabase connectivity

### App Won't Load
1. Check network tab (any 404s?)
2. Check console for errors
3. Verify environment variables loaded
4. Clear browser cache

### Users Can't Login
1. Check Supabase auth config
2. Verify allowed redirect URLs
3. Check if email verification required
4. Review RLS policies

### Database Connection Issues
1. Check Supabase status
2. Verify connection string
3. Check network/firewall
4. Increase connection pool if needed

## Scaling Considerations

### If traffic increases:

1. **Supabase**:
   - Enable caching
   - Optimize queries
   - Consider dedicated tier

2. **Frontend**:
   - Enable edge caching (Vercel Edge, Cloudflare)
   - Code-split bundles
   - Lazy load components

3. **Database**:
   - Add read replicas
   - Optimize indexes
   - Archive old data

## Useful Commands

```bash
# View build size
npm run build && du -sh dist/

# Test production build locally
npm run preview

# Check for unused dependencies
npm install -g depcheck && depcheck

# Security audit
npm audit
npm audit fix  # Be careful with this

# Update dependencies
npm update

# Check TypeScript compilation
npx tsc --noEmit
```

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **Vite Docs**: https://vitejs.dev/
- **React Docs**: https://react.dev/
- **Vercel Docs**: https://vercel.com/docs
- **Netlify Docs**: https://docs.netlify.com/

## Deployment Success Checklist

After deploying, verify:

- [ ] Domain resolves correctly
- [ ] SSL certificate valid
- [ ] App loads without errors
- [ ] All routes accessible
- [ ] Authentication works
- [ ] Database queries successful
- [ ] Images/assets loading
- [ ] Responsive design works
- [ ] No 404 errors in console
- [ ] Performance acceptable
- [ ] Monitoring setup working
- [ ] Backups configured
- [ ] Team notified of deployment

---

**Last Updated**: December 8, 2024
**Status**: Ready for Production Deployment
