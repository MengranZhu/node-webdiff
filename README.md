node-webdiff
============

What?
----
Generates HTML diffs from git repositories. Essentially, this project glues together [diff2Html](https://github.com/rtfpessoa/diff2html) and [nodegit](https://github.com/nodegit/nodegit) to generate HTML diffs which suit our purposes.

Why?
----
We use a monorepo at Starling, which makes generating concise release reports from Github challenging.

How
---

### Install
```sh
npm -g i webdiff
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

Who
---
If you need to generate a human-readable diff from two tags while filtering out certain paths, this project may help you.


Credits
-------
Many thanks to the creators of [diff2Html](https://github.com/rtfpessoa/diff2html) and [nodegit](https://github.com/nodegit/nodegit). This project is really just glueing those two projects together. Without them, this task would have been a lot more difficult!
