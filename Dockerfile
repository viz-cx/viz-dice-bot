# Pinned: node:lts-slim floated to a release whose image ships no yarn (build broke 2026-11-03).
# Matches CI (Node 22). Bump deliberately, with a yarn/corepack install step if needed.
FROM node:22-slim

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

USER node

COPY --chown=node:node . .

RUN yarn install

CMD [ "yarn", "distribute" ]
