#!/bin/bash
set -e

echo "Ensuring data directory exists..."
mkdir -p /data/chroma_db

# 1. Start Chroma DB in the background, pointing to the persistent disk
echo "Starting Chroma DB..."
chroma run --path /data/chroma_db --host 127.0.0.1 --port 8000 &

# 2. Start Python Embedding Server in the background
echo "Starting Embedding Server..."
python3 scripts/embed_server.py &

# Wait a few seconds for services to boot
sleep 5

# 3. Start Next.js frontend & API
echo "Starting Next.js..."
npm run start
