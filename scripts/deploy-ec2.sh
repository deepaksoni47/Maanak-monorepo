#!/bin/bash
# ==============================================================================
# MAANAK (मानक) — EC2 Backend Update & Restart Script
# ==============================================================================
set -e

echo "🚀 [MAANAK] Starting EC2 backend deployment update..."

# 1. Navigate to project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"
echo "📂 Working directory: $PROJECT_ROOT"

# 2. Pull latest code from GitHub
echo "📥 Pulling latest changes from git..."
git checkout -- pnpm-lock.yaml 2>/dev/null || true
git pull origin main

# 3. Install dependencies using pnpm
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile || pnpm install

# 4. Generate Prisma Client & Run DB Migrations
echo "🗄️ Generating Prisma client and executing migrations..."
pnpm --filter @maanak/db run generate
pnpm --filter @maanak/db run migrate:deploy

# 5. Build shared packages and API backend
echo "🔨 Building API and workspace dependencies..."
pnpm --filter @maanak/api... build

# 6. Restart/Reload backend with PM2
echo "🔄 Reloading PM2 process..."
if pm2 list | grep -q "maanak-api"; then
  pm2 reload maanak-api --update-env
else
  echo "⚠️ PM2 process 'maanak-api' not running. Starting fresh..."
  pm2 start ecosystem.config.cjs
fi

pm2 save

echo "✅ [MAANAK] Backend successfully updated and running!"
pm2 status maanak-api
