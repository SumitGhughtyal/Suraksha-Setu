# Use an official Node.js runtime
FROM node:18-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of your application's source code
COPY . .

# Expose the port your app runs on (e.g., 8080)
EXPOSE 8080

# The command to start your app
# (Change 'server.js' if your main file is named something else)
CMD [ "node", "server.js" ]