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
```
$ webdiff --help
Usage: webdiff [options]

Options:

  -V, --version           output the version number
  -p, --path [path]       Path to repository (default: .)
  -b, --base <oid>        Base commit / tag
  -h, --head <oid>        Head commit / tag
  -t, --title [title]     Title to use for the output html page (default: null)
  --tagprefix [prefix]    Tag prefix to filter on. Only used when finding the previous tag, when base tag is not specified (default: null)
  -c, --component <path>  Optional component to diff. Must be a relative path to a directory within the repository from its root. Other directories at the same level are filtered from the diff. Whole repository is diff'd if not specified. (default: null)
  --sort <method>         Sorting method to use. Valid options are "alpha" for alphanumeric sort, "semver" for semantic versioning, or "none" to leave the order as returned by NodeGit (which may do its own sorting). (default: alpha)
  -h, --help              output usage information

If --base is not specified and --head is a tag, webdiff will list & sort the repository's tags according to the method specified by --sort, and use the previous tag to the given one as the base.
For example, given a repo with tags of ['v3', 'v1', 'v2'], web diff would default to v2 for the base tag when given a head of v3.

If --head is not specified and --base is a commit, webdiff will use the head of the current branch as the head commit
```

### Example
Conder a repo "application" (which is the git root), with the following layout:

```
application
├── .git
├── components
│   ├── foo
│   ├── bar
│   └── baz
├── config
└── shared
```

We are releasing component `foo`. Our last release is tagged `foo_1.0`, our new release is tagged `foo_2.0`.
Thus we want a diff between `tags/foo_1.0` and `tags/foo_2.0` which excludes `components/bar` and `components/baz`; while including "config" and "shared".

To generate this we would run:
```sh
$ webdiff -p ~/src/application \
    --base foo_1.0 \
    --head foo_2.0 \
    --component components/foo \
    > test.html
```

If we don't actually know what the last release was, we can supply the prefix and webdiff will figure it out by sorting the tags (configurable with `--sort`):
```sh
$ webdiff -p ~/src/application \
    --head foo_2.0 \
    --tagprefix foo- \
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
      --tagprefix foo- \
      --component components/foo \
      --head foo_2.0 \
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
