## Build stage
FROM library/node:9.2 as builder
WORKDIR /src
ADD package.json /src/package.json
RUN npm install

## Production stage
FROM library/node:9.2 as production
WORKDIR /src
COPY --from=builder /src/node_modules /src/node_modules
ADD . .
RUN npm link

ENTRYPOINT ["webdiff"]
CMD ["--help"]
