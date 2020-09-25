/*eslint no-console: 0 */
'use strict';
// require('dotenv').config();

/**
 * Google Cloud Function, single module, with single exported function.
 * @module index
 * The SRT format looks like:
 * 1
 * 00:00:22,439 --> 00:00:24,304
 * A sentence
 *
 * 2
 * 00:00:25,108 --> 00:00:26,769
 * Sentence split over
 * two lines
 *
 * ...
 * So, one line with an index, one line with timestamp info, one or more lines with sentences and one empty line
 */

// The two main cloud API's used
const {Translate} = require('@google-cloud/translate').v2;

// Some file system modules used
const fs = require('fs');
const path = require('path');

const MAX_SEGMENT_SIZE = 128; // The max number of sentences to translate with single request

const REGEX_INDEX_LINE = /^\d+$/;
const REGEX_TIMESTAMP_LINE = /^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/;

const translate = new Translate();

function translateSRTFile(sourceLang, targetLang, filePath, outputFilePath) {
    let content;
    return Promise.resolve(readSRTFile(filePath))
    .then(data => {
            if (data) {
                // We have data, let's put it in a usable structure
                content = processData(data);

                // Only perform translation requests for sentences that are not an index, nor empty, nor a timestamp
                let filtered = content.sentences.filter(element => {
                    let m = element.match(REGEX_INDEX_LINE);
                    let n = element.match(REGEX_TIMESTAMP_LINE);
                    return !(m || n || element === '');
                });

                console.log(
                    `${filtered.length} lines of text need translation`
                );
                console.log(`Batch size: ${MAX_SEGMENT_SIZE}`);

                // Break up the translation request into multiple smaller requests
                let promises = [];
                let i = 0;
                while (i < filtered.length) {
                    let from = i;
                    let to = Math.min(
                        filtered.length - 1,
                        i + MAX_SEGMENT_SIZE - 1
                    );

                    // console.log(`${from} -> ${to}`);
                    promises.push(
                        translate.translate(
                            filtered.slice(from, to + 1),
                            targetLang
                        )
                    ); // +1 because slice(start, end), end is not inclusive

                    i += MAX_SEGMENT_SIZE;
                }

                console.log(
                    `Performing ${promises.length} translation requests`
                );
                // Wait for all to finish using Promise.all()
                return Promise.all(promises)
                    .then(results => {
                        console.log('Translations done.');
                        console.log(`${results.length} segments returned`);

                        // Create a single array with all translations from the multiple translate requests
                        let translations = [];
                        results.forEach(segment => {
                            translations = translations.concat(segment[0]);
                        });

                        // Insert the translations at the right place in the output
                        content.requestLines.forEach((position, i) => {
                            content.output[position] = translations[i];
                        });
                    })
                    .catch(err => {
                        console.error(`Translation failed: ${err}`);
                        return Promise.reject(
                            `One or more translations failed (${err})`
                        );
                    });
            } else {
                console.error('Could not read data');
                return Promise.reject('Could not read data');
            }
        })
        .then(() => {

                let output = content.output.join('\n');
                let localFilename = outputFilePath;

                //console.log(output);
                console.log(`Writing translated file locally to ${localFilename}.`);

                // Write the file.
                return new Promise((resolve, reject) => {
                    fs.writeFile(localFilename, output, err => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            })
        .then(() => {
            console.log('Finished.');
            return Promise.resolve(outputFilePath);
        })
        .catch(err => {
            console.error('error : ', err);
            return Promise.reject(err);
        });
}

function readSRTFile(filePath) {
    const file = fs.readFileSync(filePath);
    const data = file.toString('utf-8');
    return data;
}

/**
 * Puts the read data in a structure with info which lines require a translation request and a placeholder for output
 * @param {string} data UTF-8 string of read data from file on local
 */
function processData(data) {
    // Convert single string to array of individual lines
    let structure;

    if (data.indexOf('\r') !== -1) {
        structure = data.split(/\r\n/);
    } else {
        structure = data.split(/\n/);
    }

    // Prepare the structure
    let resultData = {
        sentences: [], // Array with the lines original read SRT file
        requestLines: [], // Array containing indices of lines that need translation
        output: [] // Array with the lines of the translated SRT file
    };

    // Fill the data structure and detect lines that need translation
    structure.forEach((element, index) => {
        let matches = element.match(REGEX_INDEX_LINE);
        if (matches) {
            // Line ooks like a single number
            resultData.sentences.push(matches[0]);
            resultData.output.push(matches[0]);
            // resultData.sentences.push((parseInt(matches[0]) + 1).toString()); // Adding +1 to allow for custom message
            // resultData.output.push((parseInt(matches[0]) + 1).toString());
            return;
        }

        matches = element.match(REGEX_TIMESTAMP_LINE);
        if (matches) {
            // Line looks like 00:00:22,439 --> 00:00:24,304
            resultData.sentences.push(matches[0]);
            resultData.output.push(matches[0]);
            return;
        }

        if (element === '') {
            // Empty line
            resultData.sentences.push('');
            resultData.output.push('');
            return;
        } else {
            // Only other option, a line that needs to be translated
            resultData.sentences.push(element);
            resultData.output.push(element); // default the untranslated string in the output
            resultData.requestLines.push(index); // Store the index to the line to insert the translations back at the right positions
            return;
        }
    });
    //console.log(resultData.join('\n'));
    console.log(`Lines read: ${resultData.sentences.length}`);
    return resultData;
}

module.exports = {translateSRTFile};