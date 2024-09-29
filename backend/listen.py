import os
import asyncio
from signal import SIGINT, SIGTERM
from dotenv import load_dotenv
from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
    Microphone,
)

load_dotenv()

deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")

if not deepgram_api_key:
    raise Exception("Deepgram API key is missing!")

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

async def main():
    async for transcription in STT():
        print(f"Main received: {transcription}")
        # Process the transcription as needed
        if "stop" in transcription.lower():
            await stop_stream()

if __name__ == "__main__":
    asyncio.run(main())