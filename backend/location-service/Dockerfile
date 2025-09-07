# Use an official Node.js runtime
FROM node:18-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# --- THE FIX IS HERE ---
# Copy package files from the correct sub-directory
COPY location-service/package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of your application's source code from the sub-directory
COPY location-service/. .

# Expose the port your app runs on
EXPOSE 8080

# The command to start your app (using index.js from your screenshot)
CMD [ "node", "index.js" ]