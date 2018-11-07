FROM node:8

ADD . /code
RUN cd /code && \
    yarn setup && \
    yarn build && \
    cp -r ./config ./dist/config

WORKDIR /code/dist

ENV NODE_ENV=production
EXPOSE 80

CMD yarn init-system && yarn start
