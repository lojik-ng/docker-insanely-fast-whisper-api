// Import necessary modules
const express = require('express');
const path = require('path');
const fs = require('fs');
const { Formidable } = require('formidable');
const { exec } = require('child_process');
const keys = require('./keys.json');
const { DateTime } = require('luxon');
const cors = require('cors');
ffmpeg = require('fluent-ffmpeg');
const crypto = require('crypto');

// Initialize express app
const app = express();
const port = 2901;
const uploadDir = path.join('/shared', 'tempUploads');
const model = fs.readFileSync(path.join('/shared', 'server', 'model.txt'), 'utf8').trim();

const corsOptions = {
    origin: ['*'], // Replace with your allowed origins
    credentials: true, // Allow cookies for authenticated requests (optional)
};

app.use(cors(corsOptions));
// Middleware to parse JSON and urlencoded form datasss
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
/**
 * Handle form submission
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
app.post('/transcribe', async (req, res) => {
    const form = new Formidable({ multiples: false, uploadDir });

    // Parse form data
    form.parse(req, async (err, fields, files) => {
        if (err) {
            log(err);
            return res.status(200).send({ status: 'error', message: 'Error uploading audio file.' });
        }

        const apiKey = fields.apiKey[0];
        // Authenticate API key
        if (!authenticate(apiKey)) {
            return res.status(200).json({ status: 'error', message: 'Invalid API key: ' + apiKey + '' });
        }

        let jobID;
        let jobCode;

        if (fields.jobID && fields.jobID[0]) jobID = fields.jobID[0];

        let sendResponse = true;

        if (jobID) {
            jobCode = jobID + '___' + apiKey;
            const oldFile = '/shared/tempUploads/' + jobCode + '.json';
            if (fs.existsSync(oldFile)) {
                log(`Background transcription sent for job ID: ${jobID}`);
                res.status(200).json({ status: 'success', message: fs.readFileSync(oldFile, 'utf8') });
                return;
            } else {
                log(`Transcription started in the background for job ID: ${jobID}`);
                res.status(200).json({ status: 'success', message: 'Transcription started in the background.' });
                sendResponse = false
            }
        }

        // Get the uploaded audio file details
        const audioFile = files.audio[0];
        // get the file extension
        let ext = audioFile.originalFilename.split('.').pop();
        let src = audioFile.filepath;

        // Check if source file exists
        if (!fs.existsSync(src)) {
            log(`Source file does not exist: ${src}`);
            if (sendResponse) return res.status(200).json({ status: 'error', message: 'Source file does not exist.' });
        }

        let fullFilePath = path.join('/shared', 'tempUploads', uuid() + '.' + ext);
        if (ext != 'mp3' && ext != 'wav') {
            src = await convertToMp3(audioFile.filepath, '/shared/tempUploads/' + uuid() + '.mp3');
            ext = 'mp3';
            fullFilePath = src;
            fs.unlinkSync(audioFile.filepath);
        } else {
            fs.renameSync(src, fullFilePath);
        }

        try {

            // Check if destination directory exists, create if not
            const destinationDir = path.dirname(fullFilePath);
            if (!fs.existsSync(destinationDir)) {
                log(`Destination directory does not exist, creating: ${destinationDir}`);
                fs.mkdirSync(destinationDir, { recursive: true });
            }


            const output = await transcribe(fullFilePath, jobCode);
            if (sendResponse) res.status(200).json({ status: 'success', message: fs.readFileSync(output, 'utf8') });
            // fs.unlinkSync(output);
            fs.unlinkSync(fullFilePath);
        } catch (error) {
            log(error);
            if (sendResponse) res.status(200).json({ status: 'error', message: 'An error occurred' });
            fs.unlinkSync(audioFile.filepath);
        }
    });
});


app.post('/test', async (req, res) => {
    const form = new Formidable({ multiples: false, uploadDir });
    return res.status(200).send({ status: 'success', message: 'Server is working.' });

});


// Serve index.html
app.get('/', (req, res) => {
    res.status(200).sendFile('/shared/server/index.html');
});


// Start the server
const myServer = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    log(`Server is running on http://localhost:${port}`);
});
myServer.keepAliveTimeout = 60 * 60 * 1000;
myServer.headersTimeout = 61 * 60 * 1000;
myServer.on('connection', function (socket) {
    console.log("A new connection was made by a client.");
    socket.setTimeout(60 * 60 * 1000);
});
/**
 * Authenticate API key
 * @param {string} apiKey - The API key to authenticate
 * @returns {boolean} - True if API key is valid, false otherwise
 */
function authenticate(apiKey) {
    if (!apiKey) return false;
    for (const key of keys) {
        if (key.key === apiKey) {
            log(`${key.name} called API.`);
            return true;
        }
    }
    return false;
}

/**
 * Log messages
 * @param {string|Object} msg - The message to log
 */
function log(msg) {
    const today = DateTime.now().setZone("Africa/Lagos").toISODate();
    // if message is not string, convert it to string
    if (typeof msg !== 'string') msg = JSON.stringify(msg);
    fs.appendFileSync(`/shared/logs/${today}.log`, `${new Date().toLocaleString()}: ${msg}\n`);
}



/**
 * Transcribe audio file
 * @param {string} filePath - The path to the audio file
 * @returns {Promise<string>} - The path to the transcript file
 */
function transcribe(filePath, jobCode) {
    let output;
    if (jobCode) {
        output = '/shared/tempUploads/' + jobCode + '.json';
    } else output = '/shared/tempUploads/' + uuid() + '.json';
    const cmd = `insanely-fast-whisper --file-name ${filePath} --model-name ${model} --batch-size 24 --transcript-path ${output}`;

    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(output);
            }
        });
    });
}

/**
 * Generate a UUID
 * @returns {string} - The generated UUID
 */
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function convertToMp3(inputFilePath, outputFilePath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputFilePath)
            .toFormat('mp3')
            .on('end', () => {
                console.log('Conversion finished.');
                resolve(outputFilePath);
            })
            .on('error', (err) => {
                console.error('Error during conversion:', err);
                reject(err);
            })
            .save(outputFilePath);
    });
}

// function to convert string to md5
function encode(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}


