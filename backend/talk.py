from cartesia import Cartesia
import pyaudio
import os
from dotenv import load_dotenv

load_dotenv() 

client = Cartesia(api_key=os.environ.get("CARTESIA_API_KEY"))
voice_name = "New York Man"
voice_id = "a0e99841-438c-4a64-b679-ae501e7d6091"
voice = client.voices.get(id=voice_id)

if voice is None:
    print(f"Voice with ID {voice_id} not found.")
    exit(1) 


transcript = "Hello! Welcome to Cartesia"

# You can check out our models at https://docs.cartesia.ai/getting-started/available-models
model_id = "sonic-english"

# You can find the supported `output_format`s at https://docs.cartesia.ai/reference/api-reference/rest/stream-speech-server-sent-events
output_format = {
    "container": "raw",
    "encoding": "pcm_f32le",
    "sample_rate": 22050,
}

p = pyaudio.PyAudio()
rate = 22050

stream = None

# Set up the websocket connection
ws = client.tts.websocket()

# Generate and stream audio using the websocket
for output in ws.send(
    model_id=model_id,
    transcript=transcript,
    voice_embedding=voice["embedding"],
    stream=True,
    output_format=output_format,
):
    buffer = output["audio"]

    if not stream:
        stream = p.open(format=pyaudio.paFloat32, channels=1, rate=rate, output=True)

    # Write the audio data to the stream
    stream.write(buffer)

stream.stop_stream()
stream.close()
p.terminate()

ws.close()  # Close the websocket connection