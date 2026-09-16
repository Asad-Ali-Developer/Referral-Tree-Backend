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

# Install dependencies
RUN npm ci

# Copy the rest of the project (including .git folder)
COPY . ./

# Optional: Debugging
RUN ls -la

# Start the app
CMD ["npm", "run", "start"]