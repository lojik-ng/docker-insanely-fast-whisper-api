const express = require('express');
const path = require('path');
const fs = require('fs');
const formidable = require('formidable');
const { exec } = require('child_process');
const keys = require('./keys.json');
const { DateTime } = require('luxon');

const app = express();
const port = 2901;
const uploadDir = path.join(__dirname, 'uploads');

// Middleware to parse JSON and urlencoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route to handle form submission
// Route for handling TTS requests
app.post('/transcribe', async (req, res) => {
    let { apiKey } = req.body;

    if (!authenticate(apiKey)) {
        res.json({ status: 'error', message: 'Invalid API key.' });
    }

    const form = formidable({ multiples: false, uploadDir });

    const user = keys.find(key => key.key === apiKey);
    if (user) {
        log(`${user.name} called.`);
    }


    form.parse(req, async (err, fields, files) => {
        if (err) {
            log(err);
            return res.send({ status: 'error', message: 'Error uploading audio file.' });
        }

        // Get the uploaded audio file details
        const audioFile = files.audio;
        const filename = audioFile.name;
        const fullFilePath = path.join(uploadDir, filename);

        const output = await transcribe(fullFilePath);
        res.json({ status: 'success', output: output });
        fs.unlinkSync(fullFilePath);
    });

});

app.get('/', (req, res) => {
    // send index.html
    res.sendFile('/shared/server/index.html');
})

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    log(`Server is running on http://localhost:${port}`);
});

function authenticate(apiKey) {
    if (!apiKey) return false;
    // get array of keys from keys.json
    // check if apiKey is valid
    for (const key of keys) {
        if (key.key === apiKey) {
            return true;
        }
    }
    return false;
}



function log(msg) {
    const today = DateTime.now().setZone("Africa/Lagos").toISODate();
    fs.appendFileSync(`/shared/logs/${today}.log`, `${new Date().toLocaleString()}: ${JSON.stringify(msg)}\n`);
}

function transcribe(filePath) {
    return new Promise((resolve, reject) => {
        exec(`insanely-fast-whisper --file-name "${filePath}" --flash True `, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout.trim()); // Trim any extra whitespace
            }
        });
    });
}