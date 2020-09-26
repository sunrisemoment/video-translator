var formidable = require('formidable');
var fs = require('fs');
var path = require('path');
var uploadPath = 'uploads/';
var audiosPath = 'audios/';
var textPath = 'texts/';

var textToSpeech = require('./text_to_speech.js');
var speechToText = require('./speech_to_text.js');
var gttsConverter = require('./gtts_converter.js');
var translate = require('./translate_srt.js');
var vidoeUtil = require('./video_utils.js')
var express = require('express');

var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
let socketio;
if (!fs.existsSync(uploadPath)){
    fs.mkdirSync(uploadPath);
}
if (!fs.existsSync(audiosPath)){
    fs.mkdirSync(audiosPath);
}
if (!fs.existsSync(textPath)){
    fs.mkdirSync(textPath);
}

app.use('/uploads', express.static('uploads'));
app.use('/audios', express.static('audios'));
app.use('/texts', express.static('texts'));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/test.html');
});

app.get('/process/getSourceList', function(req, res){
  var sourceList = [{"label": "Afrikaans (South Africa)", "value": "af-ZA"}, {"label": "Amharic (Ethiopia)", "value": "am-ET"}, {"label": "Armenian (Armenia)", "value": "hy-AM"}, {"label": "Azerbaijani (Azerbaijan)", "value": "az-AZ"}, {"label": "Indonesian (Indonesia)", "value": "id-ID"}, {"label": "Malay (Malaysia)", "value": "ms-MY"}, {"label": "Bengali (Bangladesh)", "value": "bn-BD"}, {"label": "Bengali (India)", "value": "bn-IN"}, {"label": "Catalan (Spain)", "value": "ca-ES"}, {"label": "Czech (Czech Republic)", "value": "cs-CZ"}, {"label": "Danish (Denmark)", "value": "da-DK"}, {"label": "German (Germany)", "value": "de-DE"}, {"label": "English (United Kingdom)", "value": "en-GB"}, {"label": "English (United States)", "value": "en-US"}, {"label": "Spanish (Spain)", "value": "es-ES"}, {"label": "Basque (Spain)", "value": "eu-ES"}, {"label": "Filipino (Philippines)", "value": "fil-PH"}, {"label": "French (France)", "value": "fr-FR"}, {"label": "Galician (Spain)", "value": "gl-ES"}, {"label": "Georgian (Georgia)", "value": "ka-GE"}, {"label": "Gujarati (India)", "value": "gu-IN"}, {"label": "Croatian (Croatia)", "value": "hr-HR"}, {"label": "Zulu (South Africa)", "value": "zu-ZA"}, {"label": "Icelandic (Iceland)", "value": "is-IS"}, {"label": "Italian (Italy)", "value": "it-IT"}, {"label": "Javanese (Indonesia)", "value": "jv-ID"}, {"label": "Kannada (India)", "value": "kn-IN"}, {"label": "Khmer (Cambodia)", "value": "km-KH"}, {"label": "Lao (Laos)", "value": "lo-LA"}, {"label": "Latvian (Latvia)", "value": "lv-LV"}, {"label": "Lithuanian (Lithuania)", "value": "lt-LT"}, {"label": "Hungarian (Hungary)", "value": "hu-HU"}, {"label": "Malayalam (India)", "value": "ml-IN"}, {"label": "Marathi (India)", "value": "mr-IN"}, {"label": "Dutch (Netherlands)", "value": "nl-NL"}, {"label": "Nepali (Nepal)", "value": "ne-NP"}, {"label": "Norwegian Bokmål (Norway)", "value": "nb-NO"}, {"label": "Polish (Poland)", "value": "pl-PL"}, {"label": "Portuguese (Brazil)", "value": "pt-BR"}, {"label": "Portuguese (Portugal)", "value": "pt-PT"}, {"label": "Romanian (Romania)", "value": "ro-RO"}, {"label": "Sinhala (Srilanka)", "value": "si-LK"}, {"label": "Slovak (Slovakia)", "value": "sk-SK"}, {"label": "Slovenian (Slovenia)", "value": "sl-SI"}, {"label": "Sundanese (Indonesia)", "value": "su-ID"}, {"label": "Swahili (Tanzania)", "value": "sw-TZ"}, {"label": "Swahili (Kenya)", "value": "sw-KE"}, {"label": "Finnish (Finland)", "value": "fi-FI"}, {"label": "Swedish (Sweden)", "value": "sv-SE"}, {"label": "Vietnamese (Vietnam)", "value": "vi-VN"}, {"label": "Turkish (Turkey)", "value": "tr-TR"}, {"label": "Greek (Greece)", "value": "el-GR"}, {"label": "Bulgarian (Bulgaria)", "value": "bg-BG"}, {"label": "Russian (Russia)", "value": "ru-RU"}, {"label": "Serbian (Serbia)", "value": "sr-RS"}, {"label": "Ukrainian (Ukraine)", "value": "uk-UA"}, {"label": "Hebrew (Israel)", "value": "he-IL"}, {"label": "Arabic (Israel)", "value": "ar-IL"}, {"label": "Arabic (United Arab Emirates)", "value": "ar-AE"}, {"label": "Arabic (Saudi Arabia)", "value": "ar-SA"}, {"label": "Arabic (Qatar)", "value": "ar-QA"}, {"label": "Arabic (Egypt)", "value": "ar-EG"}, {"label": "Persian (Iran)", "value": "fa-IR"}, {"label": "Hindi (India)", "value": "hi-IN"}, {"label": "Thai (Thailand)", "value": "th-TH"}, {"label": "Japanese (Japan)", "value": "ja-JP"}];
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({sourceList: sourceList}));
});

app.get('/process/getTargetList', function(req, res){
  var targetList = [{"label": "Danish", "value": "da"}, {"label": "Dutch", "value": "nl"}, {"label": "English", "value": "en"}, {"label": "French", "value": "fr"}, {"label": "German", "value": "de"}, {"label": "Icelandic", "value": "is"}, {"label": "Italian", "value": "it"}, {"label": "Japanese", "value": "ja"}, {"label": "Norwegian", "value": "no"}, {"label": "Polish", "value": "pl"}, {"label": "Portuguese", "value": "pt"}, {"label": "Romanian", "value": "ro"}, {"label": "Russian", "value": "ru"}, {"label": "Spanish", "value": "es"}, {"label": "Swedish", "value": "sv"}, {"label": "Turkish", "value": "tr"}, {"label": "Welsh", "value": "cy"}];
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({targetList: targetList}));  
});

let uploadedVideoPath = '';
app.post('/process/uploadFile', function(req, res) {
	console.log('uploadFile request received');
  if (req.url == '/process/uploadFile') {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
		var timestamp = new Date().getTime();
      var oldpath = files.file.path;
      var newpath = 'uploads/' + timestamp + '_' + files.file.name;
      fs.rename(oldpath, newpath, function (err) {
        if (err) {
          res.status(400);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: err, success: false }));
        } else {
          //conver_Video_to_Audio(newpath, 'en-US', 'ko');
          //uploadedVideoPath = newpath;
          res.status(200);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ filePath: newpath, success: true }));
        }
      });
    });
  }
});

io.on('connection', function(socket){
  console.log('socket connected');
	socketio = socket;
  socket.on('translateVideo', (data) => {

    socket.emit('progress', 'Processing...');
    console.log(data);
    var sourceLang = data.sourceLang.value;
    var targetLang = data.targetLang.value;
    uploadedVideoPath = data.filePath;
    
    conver_Video_to_Audio(uploadedVideoPath, sourceLang, targetLang);
  });
});

function conver_Video_to_Audio(videopath, sourceLang, targetLang) {
  var extension = path.extname(videopath);
  var fileName = path.basename(videopath, extension);
  var audioPath = audiosPath + fileName + '.mp3';
  vidoeUtil.convert(videopath, audioPath, function(err) {
    if(!err) {
      console.log('video->audio conversion completed' + audioPath);
      speech_text(sourceLang, targetLang, audioPath, fileName);
    }
  });
}

function speech_text(sourceLang, targetLang, audioPath, fileName) {
  speechToText.transcript(audioPath, sourceLang, function(srtString){
    console.log(srtString);
    var path = textPath + fileName + '.srt';
    fs.writeFileSync(path, srtString);
    translate_srt(path, sourceLang, targetLang, fileName);
  });
}

function translate_srt(sourcePath, sourceLang, targetLang, fileName) {
  var translated_srt_path = textPath + fileName + '_.srt';
  translate.translateSRTFile(sourceLang, targetLang, sourcePath, translated_srt_path).then((filepath) => { 
    console.log('translate finished: ' + filepath);
	var getneratedAudioPath = audiosPath + fileName + '_.mp3'
    // textToSpeech.generateAudioFile(filepath, getneratedAudioPath, targetLang, function(audioPath) {
    gttsConverter.convert(filepath, getneratedAudioPath, targetLang, function(audioPath) {
      var subtitledVideoPath = uploadPath + fileName + '_1.mp4';
      vidoeUtil.addSubtitles(uploadedVideoPath, subtitledVideoPath, translated_srt_path, function(isSuccess, data) {
		    console.log(data);
        var result2Video = 'uploads/' + fileName + '_2.mp4';
        vidoeUtil.mergeMedia(audioPath, uploadedVideoPath, result2Video, function(err){
          if(!err) {
            var response = {
              success : true,
              result1: data,
              result2: result2Video
            };
            console.log(result2Video);
            socketio.emit('translateResult', response);  
          } else {
            socketio.emit('translateResult', err);
          }
        })
      });
    });
  });
}

http.listen(5000);


