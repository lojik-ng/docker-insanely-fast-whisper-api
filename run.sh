#!/bin/bash

docker build -t whisper .

docker run -d -it -p 2901:2901 --gpus all  --restart=unless-stopped -v .:/shared --name whisper hisper

