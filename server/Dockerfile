FROM node:8

ENV NPM_CONFIG_DISTURL=https://npm.taobao.org/dist
ENV NPM_CONFIG_REGISTRY=https://registry.npm.taobao.org

RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    dpkg-reconfigure -f noninteractive tzdata

WORKDIR /code

ENV NODE_ENV=production
ADD ./package.json /code
ADD ./yarn.lock /code
RUN yarn

ADD ./dist /code
ADD ./config /code/config

EXPOSE 80

CMD yarn init-system && yarn start
