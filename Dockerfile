FROM node:16-alpine as builder

WORKDIR /app
COPY . /app

RUN apk update \
    && apk add --no-cache python3 make \
    && npm install && npx tsc \
    && rm -rf node_modules \
    && npm install --only=prod


FROM node:16-alpine

WORKDIR /app

RUN apk update && apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Europe/Kiev /etc/localtime \
    && npm install -g pm2 \
    && apk del tzdata && rm -rf /var/cache/apk/*

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/dist /app/dist
COPY ./var /app/var
COPY ./migrations /app/migrations
COPY ./ecosystem.config.cjs /app/ecosystem.config.cjs
COPY ./package.json /app/package.json