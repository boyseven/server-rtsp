const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

// Declare Express app
const app = express();
app.use(express.static('public')); // Serve static files from public directory

// Specify your stream URL
const rtspStreamUrl = "rtsp://admin:Password123@192.168.105.28:554/Streaming/Channels/001"; // replace with your actual RTSP URL

// FFmpeg setup to convert RTSP to HLS
ffmpeg(rtspStreamUrl, { timeout: 432000 }).addOptions([
    '-c:v libx264',
    '-c:a aac',
    '-ac 1',
    '-strict -2',
    '-crf 18',
    '-profile:v baseline',
    '-maxrate 512k',
    '-bufsize 1835k',
    '-hls_time 10',
    '-hls_list_size 6',
    '-hls_wrap 10',
    '-start_number 0'
]).output(path.join(__dirname, 'public/streams/stream.m3u8'))
.on('start', function (commandLine) {
    console.log('Spawned FFmpeg with command: ' + commandLine);
}).on('error', function(err, stdout, stderr) {
    console.error('Error:', err); // print error
    console.error('ffmpeg stdout:', stdout);
    console.error('ffmpeg stderr:', stderr);
}).on('end', function() {
    console.log('Transcoding succeeded !');
}).run();

// Set app to listen on specified port
app.listen(8000, () => console.log('Listening on port 8000'));
