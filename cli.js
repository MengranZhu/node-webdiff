#!/usr/bin/env node
"use strict";

const diff2html = require("diff2html").Diff2Html;
const program = require('commander');
const diff = require('./diff');
const path = require('path');
const fs = require('fs');

main();

process.on('uncaughtException', function (error) {
    console.log(error.stack);
});


function generateHtmlFromDiff(diffString, title){
    let content = Diff2Html.getPrettyHtml(diffString, {
        inputFormat: 'diff',
        outputFormat: 'line-by-line',
        showFiles: true,
        matching: 'words',
    });
    let templatePath = path.resolve(__dirname, 'dist', 'template.html');
    let template = fs.readFileSync(templatePath, 'utf8');
    let diff2htmlPath = path.join(path.dirname(require.resolve('diff2html')), '..');
    let cssFilePath = path.resolve(diff2htmlPath, 'dist', 'diff2html.min.css');
    let cssContent = fs.readFileSync(cssFilePath, 'utf8');
    let jsUiFilePath = path.resolve(diff2htmlPath, 'dist', 'diff2html-ui.min.js');
    let jsUiContent = fs.readFileSync(jsUiFilePath, 'utf8');

    return template
        .replace('<!--webdiff-title-->', title)
        .replace('<!--diff2html-css-->', '<style>\n' + cssContent + '\n</style>')
        .replace('<!--diff2html-js-ui-->', '<script>\n' + jsUiContent + '\n</script>')
        .replace('//diff2html-fileListCloseable', 'diff2htmlUi.fileListCloseable("#diff", true);')
        .replace('//diff2html-synchronisedScroll', 'diff2htmlUi.synchronisedScroll("#diff", true);')
        .replace('<!--diff2html-diff-->', content);
}


function filterDiff(gitDiff, includeRegex) {

}


function main() {
    program.version('1.0.0')
        .option('-p, --path [path]', 'Path to repository', '.')
        .option('-b, --base <oid>', 'Base tag')
        .option('-h, --head <oid>', 'Head tag')
        .option('-t, --title [title]', 'Title to use for the output html page', 'Webdiff')
        .option('-c, --component',
            'Component of release. Must be a path to a directory. Other directories at the same '
            + 'level are filtered from the diff.')
        .option('-s, --pathspec [spec]',
            'Git pathspec to filter the diff on. Should not be used in conjunction with '
            + '--component, as that is essentially a helper to calculate a pathspec for you', null)
        .parse(process.argv);

    if (typeof program.base === 'undefined') {
        console.log('base commit must be specified');
        process.exit(1);
    }

    diff(program.path, program.base, program.head, program.pathspec, (err, diff) => {
        if (err) {
            console.log(err)
            return
        }

        console.log(generateHtmlFromDiff(diff, program.title))
    });
}
