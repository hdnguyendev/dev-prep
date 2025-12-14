# 🚂 Deploy Backend to Railway

## Why Railway?

✅ **Prisma works perfectly** - No adapter needed  
✅ **File uploads work** - Has filesystem  
✅ **WebSockets work** - Full Node.js support  
✅ **Free $5 credit/month** - Enough for small apps  
✅ **Auto-deploy from Git** - CI/CD built-in  

---

## 🚀 Quick Deploy (5 minutes)

### Method 1: Automated Script

```bash
cd server
chmod +x railway-deploy.sh
./railway-deploy.sh
```

### Method 2: Manual Steps

#### 1️⃣ Install Railway CLI

```bash
curl -fsSL https://railway.app/install.sh | sh
```

#### 2️⃣ Login

```bash
railway login
```

#### 3️⃣ Initialize Project

```bash
cd server
railway init
```

Choose:
- "Create new project"
- Give it a name: `dev-prep-api`

#### 4️⃣ Set Environment Variables

```bash
# Database (from Neon)
railway variables set DATABASE_URL="postgres://user:pass@ep-xxx.neon.tech/db?sslmode=require"

# Clerk
railway variables set CLERK_PUBLISHABLE_KEY="pk_test_..."
railway variables set CLERK_SECRET_KEY="sk_test_..."

# JWT Secret
railway variables set JWT_SECRET="$(openssl rand -base64 32)"

# Other vars
railway variables set NODE_ENV="production"
railway variables set PORT="9999"
```

#### 5️⃣ Deploy!

```bash
railway up
```

#### 6️⃣ Get Your URL

```bash
railway domain
```

Or generate a public domain:
```bash
railway domain add
```

---

## 🔗 Connect Frontend

Update frontend `.env` or Cloudflare Pages env vars:

```bash
VITE_API_URL=https://your-app.railway.app
```

Redeploy frontend:
```bash
cd client
bun run deploy
```

---

## 📊 Railway Dashboard

Go to: https://railway.app/dashboard

Features:
- **Metrics** - CPU, Memory, Network
- **Logs** - Real-time application logs
- **Deployments** - History & rollback
- **Variables** - Manage env vars
- **Domains** - Custom domain setup

---

## 🔄 Auto-Deploy from GitHub

1. **Connect GitHub repo** in Railway dashboard
2. **Set build command**: `bun install && bunx prisma generate`
3. **Set start command**: `bun run src/index.ts`
4. **Every push to `main`** = automatic deployment! 🎉

---

## 💰 Pricing

**Free Tier:**
- $5 credit/month
- 500 hours execution
- Good for development & small apps

**Pro Plan ($20/mo):**
- Unlimited hours
- Priority support
- Team collaboration

---

## 🐛 Troubleshooting

### Build fails

```bash
# Check logs
railway logs

# Redeploy
railway up --detach
```

### Database connection fails

- Verify `DATABASE_URL` is POOLED connection from Neon
- Check `?sslmode=require` in connection string

### Port issues

Railway auto-assigns `PORT` env var. Make sure your code uses:

```typescript
const port = process.env.PORT || 9999;
```

---

## ✅ Post-Deployment Checklist

- [ ] API health check works: `curl https://your-app.railway.app/health`
- [ ] Database queries work: `curl https://your-app.railway.app/jobs`
- [ ] Frontend can connect to API
- [ ] Environment variables all set
- [ ] Custom domain configured (optional)

---

## 🎯 Complete Setup

```bash
# 1. Deploy backend
cd server
./railway-deploy.sh

# 2. Get Railway URL
railway domain

# 3. Update frontend
cd ../client
# Set VITE_API_URL in Cloudflare Pages dashboard

# 4. Test
curl https://your-app.railway.app/health
```

**Your full-stack app is now live!** 🚀
