const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const cluster = require('cluster');
const os = require('os');
const dotenv = require('dotenv');

// Load environment variables from the .env file
dotenv.config();

const cameras = [
  {
    "id":"001", 
    "url":"rtsp://admin:Password123@192.168.105.28:554/Streaming/Channels/001"
  }, 
  {
    "id":"002", 
    "url":"rtsp://admin:Password123@192.168.105.27:554/Streaming/Channels/001"
  }, 
  {
    "id":"003", 
    "url":"rtsp://admin:Password123@192.168.105.34:554/Streaming/Channels/001"
  }
];

const numWorkers = process.env.WORKERS || os.cpus().length;

if (cluster.isMaster) {
  // Create a worker for each CPU
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code) => {
    if (code !== 0) {
      console.error(`Worker crashed. Starting a new worker...`);
      cluster.fork();
    }
  });
} else {
  const app = express();
  app.use(express.static('public'));

  // Here the worker processes the camera(s) corresponding to its index
  const camera = cameras[cluster.worker.id - 1];
  clearOldSegments(path.join(__dirname, 'public', 'streams'), 2 * 60 * 60 * 1000);

  if (camera) {
    const outputPath = path.join(__dirname, 'public', 'streams', `stream${camera.id}.m3u8`);

    ffmpeg(camera.url, { timeout: 432000 }).addOptions([
      '-c:v libx264',
      '-c:a aac',
      '-ac 1',
      '-strict -2',
      '-crf 18',
      '-profile:v baseline',
      '-maxrate 400k',
      '-bufsize 1835k',
      '-hls_time 10',
      '-hls_list_size 6',
      '-start_number 0'
    ])
    .output(outputPath)
    .on('start',  function (commandLine) {
      console.log(`Spawned FFmpeg with command: ${commandLine}`);
    })
    .on('error',  function(err) {
      console.error(`Error on camera ${camera.id}: `, err);
    })
    .on('end',  function() {
      console.log(`Transcoding succeeded on camera ${camera.id}!`);
    })
    .run();

    setInterval(() => {
      clearOldSegments(path.join(__dirname, 'public', 'streams'), 60 * 1000); //2 * 60 * 60 * 1000 = 2 jam
    }, 60 * 1000);
  }

  function clearOldSegments(directoryPath, maxFileAge) {
    console.log('start clearing')
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        console.log(err);
      } else {
        files.forEach((file) => {
          if (file.endsWith('.ts')) {
            const filePath = path.join(directoryPath, file);
            fs.stat(filePath, (err, stats) => {
              if (err) {
                console.log(err);
              } else {
                const fileAge = Date.now() - stats.mtime;
                if (fileAge > maxFileAge) {
                  fs.unlink(filePath, (err) => {
                    if (err) {
                      console.log(err);
                    } else {
                      console.log(`Deleted ${filePath}`);
                    }
                  });
                }
              }
            });
          }
        });
      }
    });
  }

  app.get('/', function(req, res) {
        res.sendFile(path.join(__dirname, 'views', 'main.html'));
    });

  app.listen(8000, () => console.log(`Worker ${cluster.worker.id} listening on port 8000!`));
}