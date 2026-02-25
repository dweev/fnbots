FROM node:latest

# Install FFmpeg and the C++ Graphics Tools
RUN apt-get update && \
    apt-get install -y ffmpeg build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

WORKDIR /app

# Copy ALL the code first so the sticker blueprints are present
COPY . .

# NOW install packages and automatically build the C++ engines
RUN yarn install

CMD ["node", "core/main.js"]
