FROM node:16-alpine

RUN apk update && apk add --no-cache tzdata rsync openssh \
&& apk add --no-cache --virtual .gyp python3 make g++ \
&&  cp /usr/share/zoneinfo/Europe/Kiev /etc/localtime
RUN npm install -g pm2
RUN apk del tzdata && rm -rf /var/cache/apk/*