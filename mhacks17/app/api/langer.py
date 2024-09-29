from groq import Groq
import google.generativeai as genai
from dotenv import load_dotenv
from pinecone.grpc import PineconeGRPC as Pinecone
import os
load_dotenv()



pc = Pinecone(api_key="47e22f42-2ee5-4aa5-a330-66bc2324f856")
index = pc.Index("mhacks17")
genai.configure(api_key=os.environ["GEMINI_API_KEY"])
client = Groq(api_key=os.environ['GROQ_API_KEY'])


def research_tool(query: str) -> str:
    global index
    
    q_embed = genai.embed_content(
        model="models/text-embedding-004",
        content=query,
        task_type="retrieval_document",
    )
    results = index.query(
        vector=q_embed['embedding'],
        top_k=3,
        include_metadata=True
    )
    laws = ""
    for index, matchi in enumerate(results['matches']):
        laws += f"Law #{index} {matchi['metadata']['content']}\n\n"

    return laws

def run_RAG(query: str):
    global client
    laws = research_tool(query)

    chat_completion = client.chat.completions.create(
        #
        # Required parameters
        #
        messages=[
            # Set an optional system message. This sets the behavior of the
            # assistant and can be used to provide specific instructions for
            # how it should behave throughout the conversation.
            {
                "role": "system",
                "content": "you are a helpful lawyer helping a client with their legal questions. Given the relevant laws to their query answer the clients question. Make sure to keep your answer to a paragraph or less"
            },
            # Set a user message for the assistant to respond to.
            {
                "role": "user",
                "content": "LAWS:\n" + laws + "\n\nQUERY:\n" + query,
            }
        ],

        # The language model which will generate the completion.
        model="llama3-8b-8192",

        #
        # Optional parameters
        #

        # Controls randomness: lowering results in less random completions.
        # As the temperature approaches zero, the model will become deterministic
        # and repetitive.
        temperature=0.5,

        # The maximum number of tokens to generate. Requests can use up to
        # 32,768 tokens shared between prompt and completion.
        max_tokens=1024,

        # Controls diversity via nucleus sampling: 0.5 means half of all
        # likelihood-weighted options are considered.
        top_p=1,

        # A stop sequence is a predefined or user-specified text string that
        # signals an AI to stop generating content, ensuring its responses
        # remain focused and concise. Examples include punctuation marks and
        # markers like "[end]".
        stop=None,

        # If set, partial message deltas will be sent.
        stream=False,
    )

    return chat_completion.choices[0].message.content





if __name__ == '__main__':
    print(run_RAG(input("start: ")))