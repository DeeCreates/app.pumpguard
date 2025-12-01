#!/bin/bash

# PumpGuard Setup Script
# For repository: app.pumpguard

echo "🚀 Setting up PumpGuard for deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Repository: app.pumpguard${NC}"
echo -e "${YELLOW}Owner: DeeCreates${NC}"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git is not installed${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2)
echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}"

# Install dependencies
echo -e "\n📦 Installing dependencies..."
cd frontend
npm ci
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

# Type checking
echo -e "\n🔍 Running type checking..."
npm run type-check
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Type checking passed${NC}"
else
    echo -e "${YELLOW}⚠ Type checking failed (continuing anyway)${NC}"
fi

# Create environment file template
echo -e "\n🔧 Creating environment file template..."
if [ ! -f .env.local ]; then
    cat > .env.local << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# App Configuration
VITE_APP_NAME=PumpGuard
VITE_APP_VERSION=1.0.0
EOF
    echo -e "${GREEN}✓ Created .env.local template${NC}"
    echo -e "${YELLOW}⚠ Please update .env.local with your Supabase credentials${NC}"
else
    echo -e "${GREEN}✓ .env.local already exists${NC}"
fi

# Build for testing
echo -e "\n🏗️ Testing production build..."
npm run build:prod
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
    BUILD_SIZE=$(du -sh dist/ | cut -f1)
    echo -e "📊 Build size: $BUILD_SIZE"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

cd ..

# Create GitHub Secrets template
echo -e "\n🔐 GitHub Secrets Setup Instructions:"
cat << 'EOF'

=============================================
GitHub Secrets Required for CI/CD:
=============================================

Go to: https://github.com/DeeCreates/app.pumpguard/settings/secrets/actions

Add these secrets:

1. VERCEL_TOKEN
   - Get from: Vercel Dashboard → Account Settings → Tokens

2. VERCEL_ORG_ID
   - Run: vercel whoami (after installing Vercel CLI)

3. VERCEL_PROJECT_ID
   - Get from Vercel project settings URL

4. VITE_SUPABASE_URL
   - Your Supabase project URL

5. VITE_SUPABASE_ANON_KEY
   - Your Supabase anon key from project settings

=============================================
EOF

echo -e "\n✅ Setup complete!"
echo -e "\n📝 Next steps:"
echo "1. Update frontend/.env.local with your Supabase credentials"
echo "2. Set up GitHub Secrets (see instructions above)"
echo "3. Push to GitHub: git push origin main"
echo "4. Visit: https://app-pumpguard.vercel.app"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"