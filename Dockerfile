FROM node:26-alpine3.23

WORKDIR /app

COPY package.json .

COPY . .

RUN npm i

CMD ["npm", "run", "dev"]