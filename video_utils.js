const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
/**
 *    input - string, path of input file
 *    output - string, path of output file
 *    callback - function, node-style callback fn (error, result)        
 */
class VideoUtil {
  static convert(input, output, callback) {
      ffmpeg(input)
          .output(output)
          .toFormat('mp3')
          // .audioBitrate('128k')
          // .audioCodec('libwavpack') //libwavpack //libmp3lame
          .on('end', function() {                    
              console.log('conversion ended');
              callback(null);
          }).on('error', function(err){
              console.log('error: ', err);
              callback(err);
          }).run();
  }

  //for video without audio, simply do .noAudio().videoCodec('copy')
 static copyWitoutAudio(input, output, callback) {
      ffmpeg(input)
          .output(output)
          .noAudio().videoCodec('copy')
          .on('end', function() {                    
              console.log('conversion ended');
              callback(null);
          }).on('error', function(err){
              console.log('error: ', err);
              callback(err);
          }).run();
  }

  //for merging video and audio into single:
  static mergeMedia(aud, vid, output, callback) {
      ffmpeg()
          .input(aud)
          .input(vid)
          .output(output)
          .outputOptions(
            '-strict', '-2',
            '-map', '0:0',
            '-map', '1:0'
          ).on('end', function() {                    
              console.log('conversion ended');
              callback(null);
          }).on('error', function(err){
              console.log('error: ', err);
              callback(err);
          }).run();
  }

  static addSubtitles(source, output, srtPath, callback) {
    console.log("inside addSubtitles");
    ffmpeg(source)//'./' + key + '.mp4'
        .videoCodec('libx264')
        //.audioCodec('libmp3lame')
        .outputOptions(
            '-vf subtitles=' + srtPath + ":force_style='Fontsize=9,PrimaryColour=&Hffffff&'"//./jellies.srt'
        )
        .on('error', function(err) {
            callback(true, err)
        })
        .save(output)
        .on('end', function() {
            callback(false, output);
        })
  }

  static streamingVideo(req, res, newpath) {
    var path = './' + newpath + '.mp4';
    var stat = fs.statSync(path);
    var total = stat.size;
    if (req.headers['range']) {
        var range = req.headers.range;
        var parts = range.replace(/bytes=/, "").split("-");
        var partialstart = parts[0];
        var partialend = parts[1];

        var start = parseInt(partialstart, 10);
        var end = partialend ? parseInt(partialend, 10) : total - 1;
        var chunksize = (end - start) + 1;
        console.log('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);

        var file = fs.createReadStream(path, {
            start: start,
            end: end
        });
        res.writeHead(206, {
            'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4'
        });
        file.pipe(res);
    } else {
        console.log('ALL: ' + total);
        res.writeHead(200, {
            'Content-Length': total,
            'Content-Type': 'video/mp4'
        });
        fs.createReadStream(path).pipe(res);
    }
  }
}

module.exports = VideoUtil;