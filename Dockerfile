## Base stage
# public library node:9 image with security patches
FROM library/node:9-stretch as base
# remove unneeded packages
RUN DEBIAN_FRONTEND=noninteractive \
    apt-get -y remove mercurial && \
    apt-get -y autoremove
RUN DEBIAN_FRONTEND=noninteractive \
    apt-get -y update && \
    apt-get -y upgrade && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists


## Build stage
FROM base as builder
WORKDIR /src
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
