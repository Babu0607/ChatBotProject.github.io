FROM node:24.0.0-alpine
WORKDIR /app

# Copy the files that are now in the root directory
COPY package*.json ./
RUN npm install

# Copy everything else (html, css, js)
COPY . .

EXPOSE 8080
# Run the server so that localhost:8080 works
CMD ["node", "server.js"]
