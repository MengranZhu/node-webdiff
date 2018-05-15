"use strict";
const NodeGit = require('nodegit');
const path = require('path');
const async = require('async');


function isOid(string) {
    // must be a better way to do this....
    let oid = NodeGit.Oid.fromString(string).tostrS()
    return oid !== '0000000000000000000000000000000000000000';
}


function getGitTreeFromTreeish(repo, treeish, callback) {
    /* Get the tree from a tag or commit */

    if (isOid(treeish)) {
        // is an OID, lookup directly
        NodeGit.Object.lookup(repo, treeish, -2)
            .then(object => {
                // 2 is GIT_OBJ_TREE
                object.peel(2)
                    .then(tree => {
                        callback(null, tree)
                    })
                    .catch(reason => {
                        callback(`tree lookup failed: ${reason}`, null)
                    })
            })
            .catch(reason => {
                callback(reason, null)
            });
    } else {
        // is not an OID, assume tag
        NodeGit.Reference.lookup(repo, `refs/tags/${treeish}`)
            .then(reference => {
                // 2 is GIT_OBJ_TREE
                reference.peel(2)
                    .then(tree => {
                        callback(null, tree)
                    })
                    .catch(reason => {
                        callback(`tree lookup failed: ${reason}`, null)
                    })
            })
            .catch(reason => {
                callback(reason, null)
            });
    }
}


function getGitDiffFromCommits(repo, baseCommit, headCommit, pathspec, callback) {
    /*
        pathspec seems to work, unless it contains an exclude function, where it fails to match
        anything
    */
    let diffOptions = new NodeGit.DiffOptions();

    diffOptions.pathspec = pathspec || '*';
    NodeGit.Diff.treeToTree(repo, baseCommit, headCommit, diffOptions)
        .then(diff => {
            callback(null, diff);
        })
        .catch(reason => {
            callback(reason, null)
        });
}


function gitDiffToString(diff, callback) {
    diff.toBuf(NodeGit.Diff.FORMAT.PATCH)
        .then(buffer => {
            callback(null, buffer.toString())
        })
        .catch(reason => {
            callback(reason, null)
        })
}


function listTags(repoPath, callback, prefix=null) {
    NodeGit.Repository.open(path.resolve(repoPath, '.git')).then(
        repo => {
            return NodeGit.Tag.list(repo)
        })
        .then(tagList => {
            if (prefix) {
                tagList = tagList.filter(t => {
                    return t.startsWith(prefix)
                })
            }
            return callback(null, tagList.sort())
        })
        .catch(reason => {
            return callback(reason, null)
        });
}


function getHeadCommit(repoPath, callback) {
    NodeGit.Repository.open(path.resolve(repoPath, '.git')).then(repo => {
        repo.getHeadCommit().then(headCommit => {
            console.log("head commit", headCommit.toString())
            return callback(null, headCommit.toString())
        })
    })
}


function getPreviousTag(repoPath, tag, callback, tagPrefix=null) {
    listTags(
        repoPath,
        (err, tagList) => {
            if (err) {
                return callback(err, null)
            }

            if (tagList.length === 0) {
                return callback(`No tags with prefix ${tagPrefix}`, null)
            }

            let i = tagList.indexOf(tag) - 1

            if (i > 0) {
                // We've found the tag, and there is a prior one; return it
                return callback(null, tagList[i])
            } else if (i === 0) {
                // The tag exists but it is the first... this is an error
                return callback(`Only one tag with prefix ${tagPrefix}, ` +
                                `don't know what to compare`, null)
            } else {
                // The tag doesn't exist, assume it was a commit and return the last tag
                return callback(null, tagList[tagList.length - 1])
            }
        },
        tagPrefix
    )
}


function diff(repoPath, baseCommit, headCommit, pathspec, callback) {
    async.auto({
        repo: function (callback) {
            NodeGit.Repository.open(path.resolve(repoPath, '.git'))
                .then(repo => {
                    callback(null, repo);
                });
        },
        base: ['repo', function (results, callback) {
            getGitTreeFromTreeish(results.repo, baseCommit, callback)
                .catch(reason => {
                    callback(reason, null)
                })
        }],
        head: ['repo', function (results, callback) {
            getGitTreeFromTreeish(results.repo, headCommit, callback)
                .catch(reason => {
                    callback(reason, null)
                })
        }],
        diff: ['repo', 'base', 'head', function (results, finalCallback) {
            getGitDiffFromCommits(results.repo, results.base, results.head, pathspec, finalCallback)
                .catch(reason => {
                    finalCallback(reason, null)
                })
        }]
    }, function(err, results) {
        if (err) {
            console.log('error: ', err)
            process.exit(1)
        }

        gitDiffToString(results.diff, (err, stringDiff) => {
            callback(err, stringDiff)
        })
    });
}


module.exports.diff = diff;
module.exports.isOid = isOid;
module.exports.getPreviousTag = getPreviousTag;
module.exports.getHeadCommit = getHeadCommit;
