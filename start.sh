#!/bin/bash
set -e

echo "Ensuring data directory exists..."
mkdir -p /data/chroma_db

# 1. No Chroma DB needed anymore! (SQLite native vector search enabled)
if [ -z "$HF_TOKEN" ]; then
  echo "Starting local Python Embedding Server..."
  python3 scripts/embed_server.py &
else
  echo "HF_TOKEN detected! Skipping local Python embedding server to save RAM."
fi

# Wait a few seconds for services to boot
sleep 5

# 3. Start Next.js frontend & API
echo "Starting Next.js..."
npm run start
