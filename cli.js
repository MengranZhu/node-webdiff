#!/usr/bin/env node
"use strict";

const async = require('async');
const diff2html = require("diff2html").Diff2Html;
const program = require('commander');
const diff = require('./diff');
const path = require('path');
const fs = require('fs');
const util = require('util');

try {
    main();
} catch (e) {
    console.log(e);
    process.exit(1);
}

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


function filterDiff(gitDiff, component, callback) {
    // Remove other components from the diff
    let filteredPatches = []

    gitDiff.patches()
        .then(patches => {
            // Array of ConvenientPatches
            // console.log(patches)
            patches.forEach(patch => {
                // ConvenientPatch
                // console.log(patch)
                filteredPatches.push(patch.newFile().path() + " " + patch.oldFile().path())
                patch.hunks().then(hunks => {
                    hunks.forEach(hunk => {
                        hunk.lines().then(lines => {
                            filteredPatches.push("diff " + patch.oldFile().path(), patch.newFile().path())
                            filteredPatches.push(hunk.header().trim());
                            lines.forEach(line => {
                                filteredPatches.push(
                                    String.fromCharCode(line.origin()) + line.content().trim()
                                )
                            })
                        })
                    })
                })
            })
        })
        .done(diffList => {
            console.log(filteredPatches)
            callback(null, filteredPatches)
        })

}


function gitDiffToString(diff, callback) {
    callback(
        null, diff.join('\n')
    )
    // diff.toBuf(git.Diff.FORMAT.PATCH)
    //     .then(buffer => {
    //         callback(null, buffer.toString())
    //     })
    //     .catch(reason => {
    //         callback(reason, null)
    //     })
}


function main() {
    program.version('1.0.0')
        .option('-p, --path [path]', 'Path to repository', '.')
        .option('-b, --base <oid>', 'Base tag')
        .option('-h, --head <oid>', 'Head tag')
        .option('-t, --title [title]', 'Title to use for the output html page', null)
        .option('-c, --component <path>',
            'Component of release. Must be a relative path to a directory within the repository'
            + 'from its root. Other directories at the same level are filtered from the diff.')
        .option('-s, --pathspec <spec>',
            'Git pathspec to filter the diff on. An alternative to --component')
        .parse(process.argv);

    if (typeof program.base === 'undefined') {
        console.log('base commit must be specified');
        process.exit(1);
    }

    if (program.pathspec && program.component) {
        console.log('pathspec and component can not both be specified')
        process.exit(1);
    }

    let p = path.parse(program.component)
    // let ps = [
    //     "components/*",
    //     "(exclude)components/banking",
    //     // util.format("!components/%s", p.dir),
    // ]
    // program.pathspec = ps;

    var title = program.title ||
        `Diff of "${p.name || program.spec || program.repo}" ` +
        `from ${program.base} ` +
        `to ${program.head}`
    console.log(title)

    diff(program.path, program.base, program.head, program.component, (err, diff) => {
        filterDiff(
            diff, program.component, filteredDiff => {
                gitDiffToString(filteredDiff, (err, stringDiff) => {
                    callback(err, stringDiff)
                    console.log(generateHtmlFromDiff(stringDiff, title))
                })
            })
    })
}
