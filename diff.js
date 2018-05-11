"use strict";
const git = require('nodegit');
const path = require('path');
const async = require('async');


function getGitTreeFromTreeish(repo, treeish, callback) {
    /* Get the tree from a tag or commit */

    let oid = git.Oid.fromString(treeish).tostrS()
    // Feels like there should be a better way to do this
    if (oid === '0000000000000000000000000000000000000000') {
        // is not an OID, assume tag
        git.Reference.lookup(repo, `refs/tags/${treeish}`)
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
    } else {
        // is an OID, lookup directly
        git.Object.lookup(repo, treeish, -2)
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
    }
}


function getGitDiffFromCommits(repo, baseCommit, headCommit, pathspec, callback) {
    /*
        pathspec seems to work, unless it contains an exclude function, where it fails to match
        anything
    */
    let diffOptions = new git.DiffOptions();

    diffOptions.pathspec = pathspec || '*';
    git.Diff.treeToTree(repo, baseCommit, headCommit, diffOptions)
        .then(diff => {
            callback(null, diff);
        })
        .catch(reason => {
            callback(reason, null)
        });
}


function gitDiffToString(diff, callback) {
    diff.toBuf(git.Diff.FORMAT.PATCH)
        .then(buffer => {
            callback(null, buffer.toString())
        })
        .catch(reason => {
            callback(reason, null)
        })
}


module.exports = function(repoPath, baseCommit, headCommit, pathspec, callback) {
    async.auto({
        repo: function (callback) {
            git.Repository.open(path.resolve(repoPath, '.git'))
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

