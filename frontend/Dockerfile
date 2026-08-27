# frontend/Dockerfile

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

COPY . .

# Expose port 5173
EXPOSE 5173

# Run dev server and bind to host 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host"]