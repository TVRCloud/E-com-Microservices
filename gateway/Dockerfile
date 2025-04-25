# Use an official Node.js image
FROM node:23.11.0-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the code
COPY . .

# Expose port (match what's in docker-compose)
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
