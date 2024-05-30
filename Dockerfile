FROM cimg/python:3.12.3-node

RUN pip install pipx

RUN pipx install insanely-fast-whisper

RUN sudo apt update && sudo apt upgrade

RUN sudo apt install -y ffmpeg

# Set working directory
WORKDIR /shared

# Copy entrypoint script
COPY entrypoint.sh /usr/local/bin/

# Make entrypoint script executable
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set the default command to run the entrypoint script
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]


