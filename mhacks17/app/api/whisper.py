from flask_cors import CORS
from flask import Flask, request, jsonify, Response
from groq import Groq
import requests

import os
from groq import Groq

from dotenv import load_dotenv
import wave
import sys

import pyaudio
import struct
import json

CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1 if sys.platform == 'darwin' else 2
RATE = 44100

nextkey = None

app = Flask(__name__)
CORS(app)

recording = False

load_dotenv()

globaltranscription = ''
contextList = ['']

# Initialize the Groq client
client = Groq(api_key=os.environ['GROQ_API_KEY'])

# app = Flask(__name__)
# CORS(app)

load_dotenv()

@app.route("/api/record/start")
def start_rec():
    global recording
    recording = True
    with wave.open(os.path.join(os.path.dirname(__file__), 'output.wav'), 'wb') as wf:
        p = pyaudio.PyAudio()
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(p.get_sample_size(FORMAT))
        wf.setframerate(RATE)

        stream = p.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True)

        print('Recording...')
        while recording:
            data = stream.read(CHUNK)
            wf.writeframes(data)
        print('Done')

        stream.close()
        p.terminate()
    return {}
@app.route("/api/record/stop")
def stop_rec():
    global recording, globaltranscription
    recording = False
    filename = os.path.dirname(__file__) + "/output.wav" # Replace with your audio file!

    # Open the audio file
    with open(filename, "rb") as file:
        # Create a transcription of the audio file
        transcription = client.audio.transcriptions.create(
            file=(filename, file.read()), # Required audio file
            model="distil-whisper-large-v3-en", # Required model to use for transcription
            prompt="Specify context or spelling",  # Optional
            response_format="json",  # Optional
            language="en",  # Optional
            temperature=0.0  # Optional
        )
        # Print the transcription text
    globaltranscription = transcription.text
    return jsonify({"transcript": transcription.text})

contextList = [
        {
          'role': "user",
          "parts": [
            {
            "text": globaltranscription,
            }
          ]
        }
      ]

@app.route('/api/getBreadboard', methods=['POST'])
def getBreadboardOutput():
    global nextkey
    global contextList
    payload = {
      '$key': "bb-1u4b1z6p616x6i2z394pn15624w2si2f3o963r16681m3114i4",
      
      'context': contextList[-1]
    }
    # if nextkey is not None:
    #     payload['$next'] = nextkey
    contextList.append({
        "role": "user",
        "parts": [
            {
            "text": globaltranscription,
            }
          ]
    })
    res = requests.post('https://breadboard-community.wl.r.appspot.com/boards/@AdorableBeetle/prod-board-copy.bgl.api/run', json=payload)
    tism = res.text.split("\n\n")[0][6:]
    print(res.text.split("\n\n"))
    tism = '{' + tism[1:]
    tism = tism[:9] + ':' + tism[10:]
    tism = tism[:-1] + '}'
    # print(tism)
    data = json.loads(tism)
    # print(res.json())
    
    contextList.append({
        "role": "assistant",
        "parts": [
            {
            "text": data['output']['outputs']['output'][-1]['parts'][0]['text'],
            }
          ]
    })
    
    print(contextList)
    
    # nextkey = res.text.split("\n\n")[1][1]
    return {"text": data['output']['outputs']['output'][-1]['parts'][0]['text']}

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

# @app.after_request
# def add_cors_headers(response):
#     response.headers.add('Access-Control-Allow-Origin', '*')
#     response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
#     response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
#     return response
    
    
if __name__ == '__main__':
    app.run(port=5000)