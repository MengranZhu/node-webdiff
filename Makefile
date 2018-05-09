# Makefile
SHELL := /bin/bash
BUILD_NUMBER ?= SNAPSHOT
TWINE_PASSWORD ?= $(JFROG_IO_API_KEY)

.DEFAULT_GOAL := test
.PHONY: clean install test build docker publish

clean:

install:
	npm install

test:
	docker build --target=builder \
		.

docker:
	docker build \
		-t starlingbank/webdiff:$(BUILD_NUMBER) \
		.
