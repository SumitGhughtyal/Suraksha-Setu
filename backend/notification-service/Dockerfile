# Use an official Node.js runtime
FROM node:18-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package files from the correct sub-directory
COPY notification-service/package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of your application's source code
COPY notification-service/. .

# Expose the port your app runs on
EXPOSE 8080

# The command to start your app
CMD [ "node", "index.js" ]