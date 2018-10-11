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

### Example
Conder a repo "application" with the following layout:

```
-application
 |-components
 | |-foo
 | |-bar
 | |-baz
 |-config
 |-shared
```

We are releasing component `foo`. Our last release is tagged `RELEASE-1.0`, our new release is tagged `RELEASE-2.0`.
Thus we want a diff between `tags/RELEASE-1.0` and `tags/RELEASE-2.0` which excludes `components/bar` and `components/baz`; while including "config" and "shared".

To generate this we would run:
```sh
$ webdiff -p ~/src/application \
    --base RELEASE-1.0 \
    --head RELEASE-2.0 \
    --component components/foo \
    > test.html
```

If we don't actually know what the last release was, we can supply the prefix and webdiff will figure it out by sorting alphanumerically:
```sh
$ webdiff -p ~/src/application \
    --head RELEASE-2.0 \
    --tagprefix RELEASE- \
    --component components/foo \
    > test.html
```

--head and --base can also be commit shas.


### Docker Image Build
```sh
$ docker build -t webdiff:latest .
```

### Docker Image Usage
Path defaults to /data, so mount the repository to /data and you are good to go:
```sh
$ docker run -v $(pwd):/data \
    webdiff:latest \
      --tagprefix RELEASE- \
      --component components/foo \
      --head RELEASE-2.0 \
    > webdiff.html
```

Troubleshooting
---------------
```
error:  tree lookup failed: Error: the reference 'refs/tags/mytag' cannot be peeled - Cannot retrieve reference target
```
Ensure you have a full checkout and are not using git alternates. Teamcity, for example, has an option called "use mirrors", which uses git alternates to create a shared checkout on the agent. Unfortunately, libgit doesn't work against such checkouts.

Credits
-------
Many thanks to the creators of [diff2Html](https://github.com/rtfpessoa/diff2html) and [nodegit](https://github.com/nodegit/nodegit). This project is really just glueing those two projects together. Without them, this task would have been a lot more difficult!
