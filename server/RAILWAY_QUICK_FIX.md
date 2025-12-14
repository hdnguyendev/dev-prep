# 🚂 Railway Quick Fix Guide

## Current Issue: Package name & Service selection

### ✅ Fixed:
1. Changed `nodejs-20_x` → `nodejs_20` in nixpacks.toml
2. Added `.node-version` file

---

## 🚀 Deploy Steps:

### Option 1: Link to existing service

```bash
cd server

# List services
railway service list

# Link to a service (if exists)
railway service

# Deploy
railway up
```

### Option 2: Create new service

```bash
cd server

# Create new service
railway service create

# Deploy
railway up
```

### Option 3: Deploy via GitHub (Recommended!)

**Easiest way - Auto-deploy on every push:**

1. **Push to GitHub:**
   ```bash
   cd /Users/briandev/dev-prep-project/dev-prep
   git add .
   git commit -m "Add Railway config"
   git push
   ```

2. **Connect to Railway:**
   - Go to https://railway.app/new
   - Click "Deploy from GitHub repo"
   - Select your `dev-prep` repo
   - Railway will auto-detect `nixpacks.toml`

3. **Set Environment Variables in Railway Dashboard:**
   - DATABASE_URL
   - CLERK_PUBLISHABLE_KEY
   - CLERK_SECRET_KEY
   - JWT_SECRET
   - NODE_ENV=production
   - PORT=9999

4. **Deploy!**
   - Railway will auto-deploy
   - Get your URL from dashboard

---

## 🎯 Recommended: GitHub Auto-Deploy

**Why?**
- ✅ Automatic deployments on git push
- ✅ Easier to manage
- ✅ Built-in CI/CD
- ✅ Preview deployments for PRs

**Setup:**

```bash
# 1. Commit files
git add server/nixpacks.toml server/.node-version server/railway.json
git commit -m "Add Railway deployment config"
git push

# 2. Go to Railway dashboard
# 3. New Project → Deploy from GitHub
# 4. Select repo → Done!
```

---

## 📝 Environment Variables Needed:

```bash
DATABASE_URL=postgres://user:pass@ep-xxx.neon.tech/db?sslmode=require
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
JWT_SECRET=<random-32-byte-string>
NODE_ENV=production
PORT=9999
```

Generate JWT_SECRET:
```bash
openssl rand -base64 32
```

---

## ✅ After Deployment:

1. **Get your URL:**
   - From Railway dashboard
   - Or: `railway domain`

2. **Test API:**
   ```bash
   curl https://your-app.railway.app/health
   ```

3. **Update Frontend:**
   ```bash
   # In Cloudflare Pages dashboard, set:
   VITE_API_URL=https://your-app.railway.app
   ```

4. **Redeploy Frontend:**
   ```bash
   cd client
   bun run deploy
   ```

---

## 🐛 Still Having Issues?

Try **deploying via Dashboard** (100% success rate):

1. Go to https://railway.app/new
2. "Deploy from GitHub repo"
3. Select repo
4. Set env vars
5. Deploy!

**It just works!** ✨
