#!/usr/bin/env node
"use strict";

const program = require('commander');
// const diff2html = require("diff2html").Diff2Html;
const git = require('nodegit');
const path = require('path');
const async = require('async');
const util = require('util');

main();

process.on('uncaughtException', function (error) {
    console.log(error.stack);
});

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
    git.Diff.treeToTree(repo, baseCommit, headCommit)
        .then(diff => {
            callback(null, diff);
        })
        .catch(reason => {
            callback(reason, null)
        });
}


function main() {
    program.version('1.0.0')
        .option('-p, --path [path]', 'Path to repository', '.')
        .option('-b, --base <oid>', 'Base tag')
        .option('-h, --head <oid>', 'Head tag')
        .option('-c, --component',
            'Component of release. Must be a path to a directory. Other directories at the same '
            + 'level are filtered from the diff.')
        .parse(process.argv);

    if (typeof program.base === 'undefined') {
        console.log('base commit must be specified');
        process.exit(1);
    }

    console.log('started starling-diff');

    async.auto({
        repo: function (callback) {
            git.Repository.open(path.resolve(program.path, '.git'))
                .then(repo => {
                    callback(null, repo);
                });
        },
        base: ['repo', function (results, callback) {
            getGitTreeFromTag(results.repo, program.base, callback);
        }],
        head: ['repo', function (results, callback) {
            getGitTreeFromTag(results.repo, program.head, callback);
        }],
        diff: ['repo', 'base', 'head', function (results, finalCallback) {
            // console.log(`base ${results.base} head ${results.head} repo ${results.repo}`);
            getGitDiffFromCommits(results.repo, results.base, results.head, finalCallback)
        }]
    }, function(err, results) {
        if (err) {
            console.log('error: ', err)
            return
        }
        let diff = results.diff

        console.log('deltas: ', results.diff.numDeltas())

        console.log(diff)

        diff.toBuf(git.Diff.FORMAT.PATCH)
            .then(buffer => {
                console.log(buffer.toString())
            })
    });


    console.log('finished starling-diff');
    // process.exit(0);
}

