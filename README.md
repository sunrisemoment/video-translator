# video-translator
Upload a video and translate it. Add translated subtitles and generate translated audio and make new video with generated audio.

Installation and usage

1. clone or download repository to your local
2. install node-modules
	run `npm install` or `yarn install`
3. download service account json key file from google account.
	and run following command to use globally.
	`export GOOGLE_APPLICATION_CREDENTIALS = [downloaded json key file path.json]`
4. For start backend run folling command
	`yarn start` or `npm start`
  
  This node server working as follow
  
  1. upload a video from client.
    index.js line: 50 -> "/process/uploadFile"
    uploaded files are saved in `/uploads/` directory. It's named as "timestamp + _filename"
  
  2. Client request translate with source video language and target language, uploaded video path.
      
      A: back-end split audio track from source video
          index.js line: 90 -> function conver_Video_to_Audio
          video_untils.js file contains some class functions related video edite.
          generated source audio files are saved in `/audios/` directory with name : "timestamp + _filename.mp3"
      
      B: server create `.srt` format subtitle file from the audio
          index.js line: 102 -> function speech_text
          speech_to_text.js file contains speech-to-text module. google speech-to-text api used.
          generated .srt files are saved /texts/ directory
      C: server translate into target language from generated `.srt` file and create new `.srt` file.
          index.js line: 111 -> function translate_srt
          translate_srt.js file contains translation module. target language subtitle files are saved in `/texts/` directory with name: "timestamp + _filename_.srt"
     
      D: server generate new audio file from target language `.srt` file
          index.js line: 117 -> gtts.convert function
          gtts_converter.js contains generate audio module
          Newly generated target language audio files are saved in `/audios/` directory with name: "timestamp + _filename_.mp3"
      
      E: server add subtitles to source video and generate new video with combining souce video and newly generated target language audio file.
          index.js line : 119 , 222 -> vidoeUtil.addSubtitles, vidoeUtil.mergeMedia functions
          Newly generated videos are saved in /uploads/ directory with name : "timestamp + _filename_1.mp4" and "timestamp + _filename_2.mp4"
          
Finally server response to client with "translateResult" event via socket emit. Parameter contains above 2 video paths.

          
