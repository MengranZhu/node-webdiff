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

    let gitignore = []
    if (fs.existsSync(repoPath + "/.gitignore")) {
        gitignore = fs.readFileSync(repoPath + "/.gitignore").toString().trim().split("\n")
    }

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


function listTags(repoPath, callback, prefix=null) {
    git.Repository.open(path.resolve(repoPath, '.git')).then(
        repo => {
            return git.Tag.list(repo)
        })
        .then(tagList => {
            if (prefix) {
                tagList = tagList.filter(t => {
                    return t.startsWith(prefix)
                })
            }
            return callback(null, tagList.sort())
        })
        .catch(reason => {
            return callback(reason, null)
        });
}


function getPreviousTag(repoPath, tag, callback, tagPrefix=null) {
    listTags(
        repoPath,
        (err, tagList) => {
            if (err) {
                return callback(err, null)
            }

            let i = tagList.indexOf(tag) - 1

            if (i > -1) {
                return callback(null, tagList[i])
            } else {
                return callback("Could not find tag", null)
            }
        },
        tagPrefix
    )
}


function title(name, base, head) {
    return  `<h1>Diff of "${name}"</h1>` +
            `<h3>from ${base}</h3>` +
            `<h3>to ${head}</h3>`
}


function main() {
    program.version('1.0.0')
        .option('-p, --path [path]', 'Path to repository', '.')
        .option('-b, --base <oid>', 'Base tag')
        .option('-h, --head <oid>', 'Head tag')
        .option('-t, --title [title]', 'Title to use for the output html page', null)
        .option('--tagprefix [prefix]', 'Tag prefix to filter on. Only used when finding the '
                                        + 'previous tag, when base tag is not specified', null)
        .option('-c, --component <path>',
            'Optional component to diff. Must be a relative path to a directory within the '
            + 'repository from its root. Other directories at the same level are filtered from the '
            + 'diff. Whole repository is diff\'d if not specified.', null)

    program.on('--help', () => {
        console.log('')
        console.log("If a base tag is not specified, webdiff will list, sort the repository's "
                    + "tags; and use the previous tag to the given one.")
        console.log("For example, given a repo with tags of ['v3', 'v1', 'v2'], web diff would "
                    + "default to v2 for the base tag when given a head of v3.")
        console.log("Sorting is simple alphanumeric, so be aware that v1.9 would be treated as "
                    + "newer than than v1.10 as 9 > 1.")
    })

    program.parse(process.argv);

    if (typeof program.head === 'undefined') {
        console.log('head tag must be specified');
        process.exit(1);
    }

    let name
    let diffPaths
    if (program.component) {
        name = path.parse(program.component).name
        diffPaths = listPathsForDiff(program.path, program.component)
        // console.log('Paths:', diffPaths)
    } else {
        name = path.parse(program.path).name
        diffPaths = ["*"]
    }

    /*
        Because libgit's pathspec support is limited (does not support exclusions), we chain
        together diffs from a list of paths, rather than generate a single diff from a pathspec.
     */
    if (program.base) {
        generateDiffForPaths(program.path, program.base, program.head, diffPaths, (err, diffString) => {
            console.log(generateHtmlFromDiff(
                diffString, program.title || title(name, program.base, program.head))
            )
        })
    } else {
        getPreviousTag(
            program.path, program.head, (err, baseTag) => {
                if (err) {
                    console.log(err)
                }
                generateDiffForPaths(program.path, baseTag, program.head, diffPaths, (err, diffString) => {
                    console.log(generateHtmlFromDiff(
                        diffString, program.title || title(name, baseTag, program.head))
                    )
                })
            },
            program.tagprefix
        )
    }

}
