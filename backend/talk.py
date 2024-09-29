from cartesia import Cartesia
import pyaudio
import os
from dotenv import load_dotenv

load_dotenv() 


def speak(transcript):
    client = Cartesia(api_key=os.environ.get("CARTESIA_API_KEY"))
    voice_name = "Australian Narrator Lady"
    voice_id = "8985388c-1332-4ce7-8d55-789628aa3df4"
    voice = client.voices.get(id=voice_id)

    if voice is None:
        print(f"Voice with ID {voice_id} not found.")
        exit(1) 
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


