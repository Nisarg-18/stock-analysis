FROM --platform=linux/amd64 node:lts-alpine

RUN mkdir /src

WORKDIR /src

ADD package.json /src/package.json

RUN npm install

COPY . /src

EXPOSE 8080

CMD node app.js