FROM node:latest

# Install everything PLUS redis-server
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    libavformat-dev libavcodec-dev libswscale-dev libavutil-dev libavfilter-dev libavdevice-dev \
    build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    libnghttp2-dev libssl-dev pkg-config python3 redis-server

WORKDIR /app

# Copy ALL the code first
COPY . .

# Install packages
RUN yarn install

# The Hacker Bypass: Create a fake 'sudo' command that always returns success
RUN echo '#!/bin/sh\nexit 0' > /usr/bin/sudo && chmod +x /usr/bin/sudo

# Start Redis in the background, THEN start the bot
CMD ["sh", "-c", "redis-server --daemonize yes && node core/main.js"]
