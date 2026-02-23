# Use a lightweight version of Node.js
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies (including those used for Groq)
RUN npm install

# Copy the rest of the code (HTML, CSS, JS)
COPY . .

# Port that your JS server is using (adjust if necessary)
EXPOSE 8080

# Command to run the app
CMD ["node", "server.js"]
