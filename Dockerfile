# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Install Chromium and other dependencies required by whatsapp-web.js (Puppeteer)
# This is crucial for whatsapp-web.js to work in a headless environment.
RUN apk add --no-cache udev chromium nss freetype fontconfig harfbuzz openjdk17-jre

# Copy package.json and package-lock.json
COPY package*.json ./

# Install application dependencies
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
