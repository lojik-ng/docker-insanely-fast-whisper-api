// Import necessary modules
const express = require('express');
const path = require('path');
const fs = require('fs');
const { Formidable } = require('formidable');
const { exec } = require('child_process');
const keys = require('./keys.json');
const { DateTime } = require('luxon');



// Initialize express app
const app = express();
const port = 2901;
const uploadDir = path.join('/shared', 'tempUploads');
const model = fs.readFileSync(path.join('/shared', 'server', 'model.txt'), 'utf8').trim();

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
            return res.send({ status: 'error', message: 'Error uploading audio file.' });
        }

        const apiKey = fields.apiKey[0];

        // Authenticate API key
        if (!authenticate(apiKey)) {
            return res.json({ status: 'error', message: 'Invalid API key: ' + apiKey + '' });
        }

        // Get the uploaded audio file details
        const audioFile = files.audio[0];
        // get the file extension
        const fullFilePath = path.join('/shared', 'tempUploads', uuid() + audioFile.originalFilename.split('.').pop());

        try {
            // Check if source file exists
            if (!fs.existsSync(audioFile.filepath)) {
                log(`Source file does not exist: ${audioFile.filepath}`);
                return res.json({ status: 'error', message: 'Source file does not exist.' });
            }

            // Check if destination directory exists, create if not
            const destinationDir = path.dirname(fullFilePath);
            if (!fs.existsSync(destinationDir)) {
                log(`Destination directory does not exist, creating: ${destinationDir}`);
                fs.mkdirSync(destinationDir, { recursive: true });
            }

            fs.renameSync(audioFile.filepath, fullFilePath);
            const output = await transcribe(fullFilePath);
            res.json({ status: 'success', message: fs.readFileSync(output, 'utf8') });
            fs.unlinkSync(output);
            fs.unlinkSync(fullFilePath);
        } catch (error) {
            log(error);
            res.json({ status: 'error', message: 'An error occurred' });
            fs.unlinkSync(audioFile.filepath);
        }
    });
});


// Serve index.html
app.get('/', (req, res) => {
    res.sendFile('/shared/server/index.html');
});


// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    log(`Server is running on http://localhost:${port}`);
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
function transcribe(filePath) {
    const output = '/shared/tempUploads/' + uuid() + '.json';
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

