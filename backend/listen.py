import os
import asyncio
from dotenv import load_dotenv
from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
    Microphone,
)

# Load the API key from the .env file
load_dotenv()
deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")

if not deepgram_api_key:
    raise Exception("Deepgram API key is missing!")

class TranscriptCollector:
    def __init__(self):
        self.reset()

    def reset(self):
        self.transcript_parts = []

    def add_part(self, part):
        self.transcript_parts.append(part)

    def get_full_transcript(self):
        return ' '.join(self.transcript_parts)

transcript_collector = TranscriptCollector()

async def STT():
    try:
        # Configure the client options
        config = DeepgramClientOptions(options={"keepalive": "true"})
        deepgram: DeepgramClient = DeepgramClient(deepgram_api_key, config)

        # Connect using the asyncwebsocket method
        dg_connection = deepgram.listen.asyncwebsocket.v("1")

        # Event handler for receiving messages
        async def on_message(result, **kwargs):
            sentence = result.channel.alternatives[0].transcript

            if not sentence:
                return

            if not result.speech_final:
                transcript_collector.add_part(sentence)
            else:
                transcript_collector.add_part(sentence)
                full_sentence = transcript_collector.get_full_transcript()
                print(f"Speaker: {full_sentence}")
                transcript_collector.reset()

        # Event handler for errors
        async def on_error(error, **kwargs):
            print(f"Error: {error}")

        # Add event listeners
        dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
        dg_connection.on(LiveTranscriptionEvents.Error, on_error)

        # Set up LiveOptions for the transcription
        options = LiveOptions(
            model="nova-2",
            punctuate=True,
            language="en-US",
            encoding="linear16",
            channels=1,
            sample_rate=16000,
            endpointing=True
        )

        # Start the WebSocket connection
        if not await dg_connection.start(options):
            print("Failed to connect to Deepgram WebSocket")
            return

        # Open a microphone stream
        microphone = Microphone(dg_connection.send)
        microphone.start()

        while True:
            if not microphone.is_active():
                break
            await asyncio.sleep(1)

        # Finish the connection once done
        microphone.finish()
        await dg_connection.finish()

        print("Finished")

    except Exception as e:
        print(f"Could not open socket: {e}")

if __name__ == "__main__":
    asyncio.run(STT())
