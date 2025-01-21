# Use Node.js official image as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Install playwright deps
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Copy the rest of the application code
COPY . ./

# Build the TypeScript code
RUN npm run build

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]