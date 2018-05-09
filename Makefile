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
		-t quay.io/starlingbank/webdiff:$(BUILD_NUMBER) \
		-t quay.io/starlingbank/webdiff:latest \
		.

ifdef BUILD_NUMBER
  ifeq ($(shell git rev-parse --abbrev-ref HEAD), master)
publish: docker
	docker push quay.io/starlingbank/webdiff:$(BUILD_NUMBER)
	docker push quay.io/starlingbank/webdiff:latest
  else
publish:
	$(warning skipping target "publish", not on master branch)
  endif
else
publish:
	$(error the target "publish" requires that BUILD_NUMBER be set)
endif

