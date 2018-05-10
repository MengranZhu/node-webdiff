## Base stage
# nodegit sucks a little on alpine:
#   https://github.com/nodegit/nodegit/issues/1361
FROM library/node:9-alpine as base
# packages needed for nodegit at runtime
RUN apk --no-cache update && \
    apk --no-cache add \
        libcurl

RUN ln -s /usr/lib/libcurl.so.4 /usr/lib/libcurl-gnutls.so.4

## Build stage
FROM base as builder
WORKDIR /src

# packages needed for nodegit at compile/install time
RUN apk update && \
    apk add \
        build-base \
        curl-dev \
        g++ \
        gcc \
        libc-dev \
        libgit2-dev \
        libressl-dev \
        make \
        python

ADD package.json /src/package.json
RUN npm install

## Production stage
FROM base as production
WORKDIR /src

COPY --from=builder /src/node_modules /src/node_modules
ADD . .
RUN npm link

WORKDIR /data
ENTRYPOINT ["webdiff"]
CMD ["--help"]
