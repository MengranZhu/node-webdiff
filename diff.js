"use strict";
const git = require('nodegit');
const path = require('path');
const async = require('async');


function getGitTreeFromTag(repo, tagName, callback) {
    git.Reference.lookup(repo, `refs/tags/${tagName}`)
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


function getGitDiffFromCommits(repo, baseCommit, headCommit, pathspec, callback) {
    pathspec = pathspec || '*';

    var diffOptions = new git.DiffOptions();
    diffOptions.pathspec = pathspec;

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
            getGitTreeFromTag(results.repo, baseCommit, callback);
        }],
        head: ['repo', function (results, callback) {
            getGitTreeFromTag(results.repo, headCommit, callback);
        }],
        diff: ['repo', 'base', 'head', function (results, finalCallback) {
            getGitDiffFromCommits(results.repo, results.base, results.head, pathspec, finalCallback)
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

