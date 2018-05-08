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


function gitDiffToString(diff, callback) {
    diff.toBuf(git.Diff.FORMAT.PATCH)
        .then(buffer => {
            callback(null, buffer.toString())
        })
        .catch(reason => {
            callback(reason, null)
        })
}


function generateIgnoreRules(componentPath) {
    /*
        Take the component path and generate ignore rules...

        This is a giant hack because excludes don't seem to work in pathspecs given to DiffOptions
     */

    let p = path.parse(componentPath)
    let rules = `!${p.dir}/*\n${p.dir}/${p.name}\n`

    return rules
}


module.exports = function(repoPath, baseCommit, headCommit, componentPath, callback) {
    async.auto({
        repo: function (callback) {
            git.Repository.open(path.resolve(repoPath, '.git'))
                .then(repo => {
                    var r = generateIgnoreRules(componentPath)
                    console.log('ignore rules: ', r)
                    try {
                        git.Ignore.addRule(repo, r)

                    } catch (e) {
                        console.log(e)

                    }
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

        gitDiffToString(results.diff, (err, stringDiff) => {
            callback(err, stringDiff)
        })
    });
}

