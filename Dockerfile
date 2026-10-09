FROM node:20-bookworm-slim

# Install Python and SQLite dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Setup Python virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install Node dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build Next.js app
RUN npm run build

# Make start script executable
RUN chmod +x /app/start.sh

# Expose Next.js port
EXPOSE 3000

# Start services
CMD ["/app/start.sh"]
