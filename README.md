# docker-insanely-fast-whisper-api

Docker container for insanely-fast-whisper with API, UI and multi-user Auth for [insanely-fast-whisper](https://github.com/Vaibhavs10/insanely-fast-whisper)

API for whisper AI that supports multiple user authentication. Mostly implemented with Nodejs.

## Installation

```sh
git clone https://github.com/lojik-ng/docker-insanely-fast-whisper-api.git
cd docker-insanely-fast-whisper-api
mv server/keys.sample.json server/keys.json
docker build -t docker-insanely-fast-whisper-api .
docker run -d -it -p 2901:2901 --gpus all  --restart=unless-stopped -v .:/shared --name docker-insanely-fast-whisper-api docker-insanely-fast-whisper-api
```

You can now access the ui at `http://localhost:2901/`.

<h1 align="center">    
  <img src="screenshot.png" width="50%"></a>  
</h1>

### Endpoints/API

- Send a POST request to `http://localhost:2901/transcribe` with `{audio: file, apiKey: string}`
- Check server/index.html for example usage of the endpoints

### API Keys/Authentication

- Edit server/keys.json in the cloned repository anytime to add or remove API keys.

### Models

Edit server/model.txt to the model you prefer. You can also use distil models.

- openai/whisper-tiny
- openai/whisper-tiny.en
- openai/whisper-base
- openai/whisper-base.en
- openai/whisper-small
- openai/whisper-small.en
- openai/whisper-medium
- openai/whisper-medium.en
- openai/whisper-large
- openai/whisper-large-v3
- etc

### Logging

- logs are rotated daily and can be found in /logs folder of the cloned repository.
- Logs are never purged. You'll need to manually purge the logs.
- Access logs, error logs etc are lumped together

### Features

- Requires GPU. I tested with Nvidia GPU (Cuda).
- API is written in NodeJS so should be easy for JS devs to modify. Check `server/index.js`.
- Authentication: You can add as many users and ban users just by editing the `server/keys.json` file.
- Logging: It logs all user requests, errors etc.

## Todo

- Speed up inference with Flash attention 2.
- Create translation API
