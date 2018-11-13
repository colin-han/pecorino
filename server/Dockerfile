FROM node:10

ADD . /code
RUN cd /code && \
    yarn setup && \
    yarn build && \
    cp -r ./config ./dist/config && \
    cp ./package.json /code/dist/package.json

WORKDIR /code/dist

ENV NODE_ENV=production
EXPOSE 4070

CMD yarn init-system && yarn start
