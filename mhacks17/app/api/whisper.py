from flask_cors import CORS
from flask import Flask, request, jsonify, Response
from groq import Groq

import os
from groq import Groq

from dotenv import load_dotenv
import wave
import sys

import pyaudio

CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1 if sys.platform == 'darwin' else 2
RATE = 44100

app = Flask(__name__)
CORS(app)

recording = False




# Initialize the Groq client
client = Groq()

app = Flask(__name__)
CORS(app)

load_dotenv()

@app.route("/api/record/start")
def start_rec():
    recording = True
    with wave.open('output.wav', 'wb') as wf:
        p = pyaudio.PyAudio()
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(p.get_sample_size(FORMAT))
        wf.setframerate(RATE)

        stream = p.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True)

        print('Recording...')
        while recording:
            wf.writeframes(stream.read(CHUNK))
        print('Done')

        stream.close()
        p.terminate()

@app.route("/api/record/stop")
def stop_rec():
    recording = False


# # Specify the path to the audio file
# filename = os.path.dirname(__file__) + "/sample_audio.m4a" # Replace with your audio file!

# # Open the audio file
# with open(filename, "rb") as file:
#     # Create a transcription of the audio file
#     transcription = client.audio.transcriptions.create(
#       file=(filename, file.read()), # Required audio file
#       model="distil-whisper-large-v3-en", # Required model to use for transcription
#       prompt="Specify context or spelling",  # Optional
#       response_format="json",  # Optional
#       language="en",  # Optional
#       temperature=0.0  # Optional
#     )
#     # Print the transcription text
#     print(transcription.text)
    
if __name__ == '__main__':
    app.run(port=5000)