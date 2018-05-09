#!/usr/bin/env node
"use strict";

const async = require('async');
const diff2html = require("diff2html").Diff2Html;
const program = require('commander');
const diff = require('./diff');
const path = require('path');
const fs = require('fs');
const util = require('util');
const git = require('nodegit');

// Always ignore these paths in any repository
// Git pathspecs are valid here
const excludePaths = [
    'README.md',
    '.git',
    '.github',
    '.gitignore',
    '.idea',
]

try {
    main();

} catch (e) {
    console.log(e)
    process.exit(1)
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


function listPathsForDiff(repoPath, componentPath) {
    /*
        List the paths that we need to include in our diff

        DOES NOT WORK RECURSIVELY; I.E. the component must be no more than 1-level from root
     */

    let paths = [componentPath]
    let cp = path.parse(componentPath)

    let gitignore = fs.readFileSync(repoPath + "/.gitignore").toString().trim().split("\n")
    let files = fs.readdirSync(repoPath)

    let ignorePathspecs = []
    gitignore.forEach(entry => {
        ignorePathspecs.push(git.Pathspec.create(entry))
    })
    excludePaths.forEach(entry => {
        ignorePathspecs.push(git.Pathspec.create(entry))
    })

    for (let i = 0; i < files.length; i++) {
        let file = files[i]

        let inGitignore = 0
        ignorePathspecs.forEach(ps => {
            if (ps.matchesPath(0, file)) {
                inGitignore = 1
            }
        })

        if (inGitignore === 1) {
            continue
        }
        if (file === cp.dir) {
            continue
        }

        paths.push(file)
    }
    return paths
}


function generateDiffForPaths(repoPath, baseCommit, headCommit, pathArray, callback) {
    async.concat(
        pathArray,
        (p, _callback) => {
            diff(repoPath, baseCommit, headCommit, p, (err, _diff) => {
                if (err) {
                    return _callback(err, null)
                }
                return _callback(null, _diff)
            })
        },
        (err, concatDiff) => {
            if (err) {
                return callback(err, null)
            }
            concatDiff = concatDiff.filter(s => {return s !== '' })
            return callback(null, concatDiff.join(''))
        }
    )
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
        .parse(process.argv);

    if (typeof program.base === 'undefined') {
        console.log('base commit must be specified');
        process.exit(1);
    }

    if (program.pathspec && program.component) {
        console.log('pathspec and component can not both be specified')
        process.exit(1);
    }

    let name = path.parse(program.component).name
    let title = program.title ||
        `Diff of ${name || program.component || program.path} ` +
        `from ${program.base} ` +
        `to ${program.head}`

    /*
        Because libgit's pathspec support is limited (does not support exclusions), we chain
        together diffs from a list of paths, rather than generate a single diff from a pathspec.
     */
    let diffPaths = listPathsForDiff(program.path, program.component)
    // console.log('Paths:', diffPaths)

    generateDiffForPaths(program.path, program.base, program.head, diffPaths, (err, diffString) => {
        // console.log(diffString)
        console.log(generateHtmlFromDiff(diffString, title))
    })
}
