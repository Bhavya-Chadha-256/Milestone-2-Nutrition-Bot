#!/bin/bash
set -e

echo "Ensuring data directory exists..."
mkdir -p /data/chroma_db

# 1. No Chroma DB needed anymore! (SQLite native vector search enabled)
# 2. Local Python Embedding Server disabled to prevent OOMs on Render Free Tier

# Wait a few seconds for services to boot
sleep 5

# 3. Start Next.js frontend & API
echo "Starting Next.js..."
npm run start
