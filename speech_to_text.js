// Imports the Google Cloud client library
  'use strict';
  
  const subtitle = require('subtitle');
  const speech = require('@google-cloud/speech');//.v1p1beta1;
  const fs = require('fs');
  const gstt = require('gstt-to-srt-converter')
  // Creates a client
  const client = new speech.SpeechClient();

  async function transcript(videoPath, language, callback) {
    try {
      // The name of the audio file to transcribe
      const fileName = videoPath;//'./resources/audio.raw';

      // Reads a local audio file and converts it to base64
      const file = fs.readFileSync(fileName);
      const audioBytes = file.toString('base64');

      // The audio file's encoding, sample rate in hertz, and BCP-47 language code
      const audio = {
        content: audioBytes,
      };
      const config = {
        encoding: 'MP3',
        model: 'video',
        sampleRateHertz: 16000,
        languageCode: language,//'en-US',
        enableWordConfidence: true,
        enableWordTimeOffsets: true,
        enableAutomaticPunctuation: true,
      };
      const request = {
        audio: audio,
        config: config,
      };
      
      const [response] = await client.recognize(request);
      var result = gstt.convertGSTTToSRT(JSON.stringify(response));

      callback(result);
    } catch (err) {
      console.error('ERROR:', err);
      callback(err);
    }

    function secToHhmmssms(sec) {
      const ms = sec.substr(-1);
      const h = Math.floor(sec / 3600).toString().padStart(2, '0');
      const m = Math.floor(sec / 60).toString().padStart(2, '0');
      const s = Math.floor(sec % 60).toString().padStart(2, '0');
      return `${h}:${m}:${s},${ms}00`;
    }

  }

  module.exports = {transcript}

