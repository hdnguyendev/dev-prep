# 🚀 Full Stack Deployment Guide

Complete guide for deploying Dev Prep to Cloudflare.

---

## 📦 Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Cloudflare Edge                     │
├──────────────────────┬──────────────────────────────┤
│   Frontend (Pages)   │   Backend (Workers)          │
│   React + Vite       │   Hono API                   │
│   Static Assets      │   Serverless Functions       │
└──────────────────────┴──────────────────────────────┘
           │                        │
           │                        │
           ▼                        ▼
      Clerk Auth              Neon PostgreSQL
   (Authentication)        (with connection pooling)
```

---

## 🎯 Quick Start (15 minutes)

### 1️⃣ Setup Database (5 min)

**Use Neon (Recommended):**

```bash
# 1. Create account at https://neon.tech
# 2. Create new project
# 3. Copy POOLED connection string
# 4. Run migrations
cd server
DATABASE_URL="your-neon-pooled-url" bunx prisma db push
DATABASE_URL="your-neon-pooled-url" bun run seed
```

### 2️⃣ Deploy Backend (5 min)

```bash
cd server

# Login to Cloudflare
bunx wrangler login

# Set secrets
wrangler secret put DATABASE_URL
# Paste your Neon POOLED connection string

wrangler secret put CLERK_PUBLISHABLE_KEY
# Paste from Clerk dashboard

wrangler secret put CLERK_SECRET_KEY
# Paste from Clerk dashboard

wrangler secret put JWT_SECRET
# Generate: openssl rand -base64 32

# Deploy!
bun run deploy
```

**Your API will be at:** `https://dev-prep-api.your-subdomain.workers.dev`

### 3️⃣ Deploy Frontend (5 min)

```bash
cd client

# Login to Cloudflare (if not already)
bunx wrangler login

# Deploy
bun run deploy

# After first deploy, set environment variables in Cloudflare Dashboard:
# - VITE_API_URL=https://dev-prep-api.your-subdomain.workers.dev
# - VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Redeploy after setting env vars
bun run deploy
```

**Your app will be at:** `https://dev-prep-client.pages.dev`

---

## 🔧 Detailed Setup

### Database Options

| Provider | Pros | Setup Time | Cost |
|----------|------|------------|------|
| **Neon** ⭐ | Built-in pooling, serverless, instant | 2 min | Free tier generous |
| **Supabase** | Full backend, auth, storage | 3 min | Free tier good |
| **Railway** | Simple, great UX | 3 min | $5/month after trial |

### Environment Variables

**Backend Secrets (via `wrangler secret put`):**
```bash
DATABASE_URL          # Neon/Supabase POOLED connection
CLERK_PUBLISHABLE_KEY # From Clerk dashboard
CLERK_SECRET_KEY      # From Clerk dashboard  
JWT_SECRET           # Random 32-byte string
```

**Frontend Env Vars (via Cloudflare Pages Dashboard):**
```bash
VITE_API_URL                  # Your Workers API URL
VITE_CLERK_PUBLISHABLE_KEY    # From Clerk dashboard
```

---

## 📚 Documentation

- **Backend Deploy:** [`server/DEPLOY.md`](./server/DEPLOY.md)
- **Frontend Deploy:** [`client/DEPLOY.md`](./client/DEPLOY.md)

---

## 🎨 Custom Domains

### Backend API

1. Add custom domain in Cloudflare Workers dashboard
2. Point `api.yourdomain.com` to your Worker

### Frontend

1. Add custom domain in Cloudflare Pages dashboard
2. Point `yourdomain.com` to Pages

**Update frontend env:**
```bash
VITE_API_URL=https://api.yourdomain.com
```

---

## 🐛 Common Issues

### Backend

**❌ "Cannot connect to database"**
- Use POOLED connection string from Neon/Supabase
- Verify `?sslmode=require` in connection string

**❌ "File upload not working"**
- Workers don't have filesystem
- Use Cloudflare R2 or external storage

### Frontend

**❌ "API calls failing"**
- Check `VITE_API_URL` env var is set
- Verify CORS settings in backend

**❌ "Clerk authentication error"**
- Verify `VITE_CLERK_PUBLISHABLE_KEY`
- Check Clerk dashboard settings

---

## 💰 Cost Estimate

**Free Tier (Good for MVP/Testing):**
- Cloudflare Workers: 100k requests/day ✅
- Cloudflare Pages: Unlimited ✅
- Neon: 3 projects, 512MB storage ✅
- Clerk: 10k MAU ✅

**Total: $0/month** for most small apps! 🎉

**Paid (When scaling):**
- Cloudflare Workers: $5/month (10M requests)
- Cloudflare Pages: Free
- Neon: $19/month (more compute)
- Clerk: $25/month (more users)

**Total: ~$50/month** for 100k+ users

---

## 🔄 CI/CD

Both frontend and backend can auto-deploy from GitHub:

1. **Connect repo** to Cloudflare Pages/Workers
2. **Set environment variables**
3. **Every push to `main`** = automatic deployment! 🚀

---

## ✅ Post-Deployment Checklist

**Backend:**
- [ ] Database migrations successful
- [ ] Health check: `curl https://your-api.workers.dev/health`
- [ ] All secrets set
- [ ] CORS working

**Frontend:**
- [ ] App loads at Pages URL
- [ ] Can connect to API
- [ ] Clerk login works
- [ ] Environment variables set

**Production:**
- [ ] Custom domains configured
- [ ] SSL certificates active
- [ ] Monitoring enabled
- [ ] Error tracking setup

---

## 🎯 Next Steps

1. **Monitor your app:** Cloudflare Analytics Dashboard
2. **Setup alerts:** Workers → Settings → Alerts
3. **Add custom domain:** Pages/Workers → Settings → Domains
4. **Enable caching:** Add Cache API for better performance

---

## 🆘 Support

- **Backend issues:** See `server/DEPLOY.md`
- **Frontend issues:** See `client/DEPLOY.md`
- **Cloudflare docs:** https://developers.cloudflare.com

**Deploy now and go live in 15 minutes!** 🚀
