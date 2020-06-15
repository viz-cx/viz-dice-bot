FROM node:current-alpine

ARG PORT=8080

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

USER node

COPY --chown=node:node . .

RUN yarn install

EXPOSE ${PORT}

ENV PORT=${PORT}

CMD [ "yarn", "webhook" ]
