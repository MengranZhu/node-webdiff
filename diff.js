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


function getGitDiffFromCommits(repo, baseCommit, headCommit, callback) {
    // let diffOptions = new git.DiffOptions();

    git.Diff.treeToTree(repo, baseCommit, headCommit)
        .then(diff => {
            callback(null, diff);
        })
        .catch(reason => {
            callback(reason, null)
        });
}



module.exports = function(repoPath, baseCommit, headCommit, componentPath, callback) {
    async.auto({
        repo: function (callback) {
            git.Repository.open(path.resolve(repoPath, '.git'))
                .then(repo => {
                    callback(null, repo);
                });
        },
        base: ['repo', function (results, callback) {
            getGitTreeFromTag(results.repo, baseCommit, callback)
                .catch(reason => {
                    callback(reason, null)
                })
        }],
        head: ['repo', function (results, callback) {
            getGitTreeFromTag(results.repo, headCommit, callback)
                .catch(reason => {
                    callback(reason, null)
                })
        }],
        diff: ['repo', 'base', 'head', function (results, finalCallback) {
            getGitDiffFromCommits(results.repo, results.base, results.head, finalCallback)
                .catch(reason => {
                    finalCallback(reason, null)
                })
        }]
    }, function(err, results) {
        if (err) {
            console.log('error: ', err)
            process.exit(1)
        }

        callback(err, results.diff)
    });
}

