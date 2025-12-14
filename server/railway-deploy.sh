#!/bin/bash

echo "🚂 Railway Deployment Script"
echo "=============================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    curl -fsSL https://railway.app/install.sh | sh
    echo "✅ Railway CLI installed!"
fi

echo ""
echo "🔐 You'll need these values ready:"
echo "1. DATABASE_URL (from Neon - pooled connection)"
echo "2. CLERK_PUBLISHABLE_KEY"
echo "3. CLERK_SECRET_KEY"
echo "4. JWT_SECRET (generate with: openssl rand -base64 32)"
echo ""

read -p "Press Enter when ready to continue..."

# Login to Railway
echo ""
echo "🔑 Logging in to Railway..."
railway login

# Initialize project
echo ""
echo "📁 Initializing Railway project..."
railway init

# Set environment variables
echo ""
echo "⚙️  Setting environment variables..."

echo "Paste your DATABASE_URL (Neon pooled connection):"
read -r db_url
railway variables set DATABASE_URL="$db_url"

echo "Paste your CLERK_PUBLISHABLE_KEY:"
read -r clerk_pub
railway variables set CLERK_PUBLISHABLE_KEY="$clerk_pub"

echo "Paste your CLERK_SECRET_KEY:"
read -r clerk_secret
railway variables set CLERK_SECRET_KEY="$clerk_secret"

echo "Paste your JWT_SECRET (or generate with: openssl rand -base64 32):"
read -r jwt
railway variables set JWT_SECRET="$jwt"

railway variables set NODE_ENV="production"
railway variables set PORT="9999"

# Deploy
echo ""
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Get your Railway URL from: railway domain"
echo "2. Update frontend VITE_API_URL to your Railway URL"
echo "3. Test API: curl https://your-app.railway.app/health"

