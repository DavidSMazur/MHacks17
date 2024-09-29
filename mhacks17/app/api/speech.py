import os
import asyncio

from flask_cors import CORS
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from signal import SIGINT, SIGTERM
from dotenv import load_dotenv
from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
    Microphone,
)
from cartesia import Cartesia
import pyaudio


app = Flask(__name__)
CORS(app)

load_dotenv('.env')

deepgram_api_key = os.getenv('DEEPGRAM_API_KEY')

is_finals = []
stop_streaming = False
transcription_queue = asyncio.Queue()

async def stop_stream():
    global stop_streaming
    stop_streaming = True

async def STT():
    global is_finals, stop_streaming
    try:
        loop = asyncio.get_running_loop()

        config = DeepgramClientOptions(options={"keepalive": "true"})
        deepgram: DeepgramClient = DeepgramClient(deepgram_api_key, config)

        dg_connection = deepgram.listen.asyncwebsocket.v("1")

        async def on_open(self, open, **kwargs):
            print("Connection Open")

        async def on_message(self, result, **kwargs):
            global is_finals
            sentence = result.channel.alternatives[0].transcript
            if len(sentence) == 0:
                return
            if result.is_final:
                is_finals.append(sentence)
                if result.speech_final:
                    utterance = " ".join(is_finals)
                    print(f"Speech Final: {utterance}")
                    await transcription_queue.put(utterance)
                    is_finals = []
                else:
                    print(f"Is Final: {sentence}")
            else:
                print(f"Interim Results: {sentence}")

        async def on_utterance_end(self, utterance_end, **kwargs):
            global is_finals
            if len(is_finals) > 0:
                utterance = " ".join(is_finals)
                print(f"Utterance End: {utterance}")
                await transcription_queue.put(utterance)
                is_finals = []

        async def on_error(self, error, **kwargs):
            print(f"Handled Error: {error}")

        dg_connection.on(LiveTranscriptionEvents.Open, on_open)
        dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
        dg_connection.on(LiveTranscriptionEvents.UtteranceEnd, on_utterance_end)
        dg_connection.on(LiveTranscriptionEvents.Error, on_error)

        options = LiveOptions(
            model="nova-2",
            language="en-US",
            smart_format=True,
            encoding="linear16",
            channels=1,
            sample_rate=16000,
            interim_results=True,
            utterance_end_ms="1000",
            vad_events=True,
            endpointing=300,
        )

        addons = {"no_delay": "true"}

        print("\n\nStart talking! Use stop_stream() to stop...\n")
        if await dg_connection.start(options, addons=addons) is False:
            print("Failed to connect to Deepgram")
            return

        microphone = Microphone(dg_connection.send)
        microphone.start()

        try:
            while not stop_streaming:
                try:
                    transcription = await asyncio.wait_for(transcription_queue.get(), timeout=1.0)
                    yield transcription
                except asyncio.TimeoutError:
                    pass
        finally:
            microphone.finish()
            await dg_connection.finish()

        print("Streaming finished")

    except Exception as e:
        print(f"Could not open socket: {e}")
        
async def listenRunner():
    async for transcription in STT():
            print(f"Main received: {transcription}")
            # # Process the transcription as needed
            # if "stop" in transcription.lower():
            #     await stop_stream()

@app.route('/api/listen/start', methods=['GET'])
def listen():
    asyncio.run(listenRunner)

@app.route('/api/listen/stop', methods=['GET'])
def listen_stop():
    asyncio.run(stop_stream)
    
@app.route('/api/talk')
def TTS(transcript):
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
    

