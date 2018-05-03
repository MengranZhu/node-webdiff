#!/usr/bin/env node
"use strict";

// const diff2html = require("diff2html").Diff2Html;
const program = require('commander');
const diff = require('./diff');

main();

process.on('uncaughtException', function (error) {
    console.log(error.stack);
});

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

    diff(program.path, program.base, program.head, (err, diff) => {
        console.log(diff)
    })
}
