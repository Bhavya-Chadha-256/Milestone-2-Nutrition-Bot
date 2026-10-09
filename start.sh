#!/bin/bash
set -e

echo "Ensuring data directory exists..."
mkdir -p /data/chroma_db

# 1. Start Chroma DB in the background, pointing to the persistent disk
echo "Starting Chroma DB..."
chroma run --path /data/chroma_db --host 127.0.0.1 --port 8000 &

# 2. Start Python Embedding Server in the background ONLY if we aren't using the cloud API
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
