#!/bin/bash

sudo chmod -R a+rw /shared

# Navigate to the working directory
cd /shared/server

npm install

# Start the application
npm start

