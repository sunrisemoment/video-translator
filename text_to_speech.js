var fs = require('fs');
var subsrt = require('subsrt');
const textToSpeech = require('@google-cloud/text-to-speech');
const util = require('util');


async function generateAudioFile(srtPath, outputPath, lang, callback) {
	//Read a .srt file
	var content = fs.readFileSync(srtPath, 'utf8');

	//Parse the content
	var options = { verbose: true };
	var captions = subsrt.parse(content, options);

	//Output to console
	console.log(captions);
	var content = '';
	captions.forEach((data, index) => {
		content += data.text;
	});

	const client = new textToSpeech.TextToSpeechClient();
	const request = {
	  input: {text: content},
	  voice: {languageCode: lang, ssmlGender: 'FEMALE'},
	  audioConfig: {audioEncoding: 'MP3'},
	};
	const [response] = await client.synthesizeSpeech(request);
	const writeFile = util.promisify(fs.writeFile);
	await writeFile(outputPath, response.audioContent, 'binary');
	console.log(`Audio content written to file: ${outputPath}`);
	callback(outputPath);
}

module.exports = {generateAudioFile};