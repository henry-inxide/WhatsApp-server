FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p database
EXPOSE 5000
CMD ["node", "index.js"]
