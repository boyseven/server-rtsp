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
    id: "001",
    url: "rtsp://username:password123@192.168.109.8:554/Streaming/Channels/102",
  },
  {
    id: "002",
    url: "rtsp://username:password123@192.168.109.8:554/Streaming/Channels/302",
  },
  {
    id: "003",
    url: "rtsp://username:password123@192.168.109.8:554/Streaming/Channels/502",
  },
  {
    id: "004",
    url: "rtsp://username:password123@192.168.109.8:554/Streaming/Channels/802",
  },
  {
    id: "005",
    url: "rtsp://username:password123@192.168.109.8:554/Streaming/Channels/1002",
  },
  {
    id: "006",
    url: "rtsp://username:password123@192.168.109.8:554/Streaming/Channels/1202",
  },
  {
    id: "007",
    url: "rtsp://username:password123@192.168.109.8:554/Streaming/Channels/1402",
  },
  {
    id: "008",
    url: "rtsp://username:password123@192.168.109.8:554/Streaming/Channels/1602",
  },
  {
    id: "009",
    url: "rtsp://username:password123@192.168.109.8:554/Streaming/Channels/1802",
  },
  {
    id: "010",
    url: "rtsp://username:password123@192.168.109.8:554/Streaming/Channels/2002",
  },
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
     '-preset veryfast', // Mengatur preset encoding
     '-profile:v baseline', // Profil lebih tinggi untuk kualitas lebih baik
     '-crf 18', // Menjaga kualitas video tinggi
     '-maxrate 400k', // Bitrate maksimum yang lebih tinggi
     '-bufsize 1835k', // Buffer size yang lebih besar 
     '-strict -2',
     '-hls_time 10',
     '-hls_list_size 6',
     //'-hls_flags delete_segments',
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
