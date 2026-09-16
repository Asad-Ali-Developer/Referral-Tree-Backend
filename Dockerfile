# Use official Node.js image
FROM node:18

# Install system dependencies including git, python3
RUN apt-get update && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json first for better layering
COPY package*.json ./

# Install dependencies (use npm install instead of npm ci)
RUN npm install

# Copy the rest of the project
COPY . ./

# Generate Prisma Client
RUN npx prisma generate

# Start the app
CMD ["npm", "run", "start:prod"]