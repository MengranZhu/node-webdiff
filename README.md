node-webdiff
============

What?
----
Generates HTML diffs from git repositories. Essentially, this project glues together [diff2Html](https://github.com/rtfpessoa/diff2html) and [nodegit](https://github.com/nodegit/nodegit) to generate HTML diffs which suit our purposes.

Why?
----
We use monorepos at Starling, which makes generating concise release reports from Github challenging.

Who
---
If you need to generate a human-readable diff from two tags while filtering out certain paths, this project may help you.

How
---

### Install
```sh
npm -g i .
```

### Usage
```sh
$ webdiff --help

  Usage: webdiff [options]

  Options:

    -V, --version      output the version number
    -p, --path [path]  Path to repository (default: .)
    -b, --base <oid>   Base tag
    -h, --head <oid>   Head tag
    -c, --component    Component of release. Must be a path to a directory. Other directories at the same level are filtered from the diff.
    -h, --help         output usage information
```

Example:
```sh
$ webdiff -p ~/src/foos \
    -h RELEASE-2.0 \
    --tagprefix RELEASE- \
    -c components/foo \
    > test.html
```


### Docker Image Build
```sh
$ make docker
```

### Docker Image Usage
Path defaults to /data, so mount the repository to /data and you are good to go:
```sh
$ docker run -v $(pwd):/data \
    webdiff:latest \
      --tagprefix RELEASE- \
      --component components/banking \
      --head RELEASE-2.0 \
    > webdiff.html
```

Credits
-------
Many thanks to the creators of [diff2Html](https://github.com/rtfpessoa/diff2html) and [nodegit](https://github.com/nodegit/nodegit). This project is really just glueing those two projects together. Without them, this task would have been a lot more difficult!
