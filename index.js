#!/usr/bin/env node
'use strict';

const program = require('commander');
const diff2html = require("diff2html").Diff2Html;
const Git = require('nodegit');

program.version('1.0.0')
    .option('-b, --base', 'Base commit')
    .option('-h, --head', 'Head commit')
    .option('-c, --component',
            'Component of release. Must be a path to a directory. Other directories at the same '
            + 'level are filtered from the diff.')
    .parse(process.argv);

console.log('started starling-diff');

if (!program.base){
    console.log('no base');
}
