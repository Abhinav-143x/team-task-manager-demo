FROM node:22-alpine

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm install

COPY client/package*.json ./client/
RUN cd client && npm install

COPY server ./server
COPY client ./client

RUN cd server && npx prisma generate
RUN cd client && npm run build

ENV NODE_ENV=production
ENV PORT=4000

CMD ["sh", "-c", "cd server && npx prisma migrate deploy && npm start"]
