# syntax=docker/dockerfile:1
# Pull base image from the docker hub
FROM node:18.13.0

# Create working directory, later used as the application root ./
WORKDIR /app

# First copy list of npm dependencies
COPY ["package.json", "package-lock.json*", "./"]

# Install production dependencies with npm (*npm is included in base image)
# And make sure that no file has UID or GID bigger than 65535 (resolves npm bug with tfjs-node)
RUN npm ci --omit=dev && chown -R root:root /app/node_modules/@tensorflow/tfjs-node/lib/napi-v8/tfjs_binding.node

# Copy application files, except those in .dockerignore
COPY . .

# Inform docker that the container will listen to port 3000
EXPOSE 3000

# Command to run the application = npm run start
CMD [ "npm", "run", "start" ]
