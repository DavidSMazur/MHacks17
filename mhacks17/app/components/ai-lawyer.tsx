'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Upload, Mic, StopCircle, X, Download } from "lucide-react"
import { Card, CardBody, Button } from "@nextui-org/react"
import type { StartAvatarResponse } from "@heygen/streaming-avatar"
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from "@heygen/streaming-avatar"
import ReactMarkdown from 'react-markdown'
import ReactToPdf, { usePDF } from 'react-to-pdf';
import { json } from 'stream/consumers'

interface Message {
  id: number
  text: string
  sender: 'ai' | 'user'
}

interface CasePopupProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

const CasePopup: React.FC<CasePopupProps> = ({ isOpen, onClose, content }) => {
  const { toPDF, targetRef } = usePDF({filename: 'case_summary.pdf'});

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-auto transform transition-transform duration-300 ${isOpen ? 'scale-100' : 'scale-95'}`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-indigo-600">Case Summary</h2>
          <div className="flex items-center space-x-2">
            <Button
              className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2 transition-colors duration-300"
              size="sm"
              onClick={() => toPDF()}
              aria-label="Download PDF"
            >
              <Download size={20} />
            </Button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        <div className="p-6" ref={targetRef}>
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-4 text-indigo-800" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mb-3 text-indigo-700" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mb-2 text-indigo-600" {...props} />,
              p: ({ node, ...props }) => <p className="mb-4 text-black" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 text-black" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 text-black" {...props} />,
              li: ({ node, ...props }) => <li className="mb-2 text-black" {...props} />,
              a: ({ node, ...props }) => <a className="text-blue-600 hover:underline" {...props} />,
              blockquote: ({ node, ...props }) => (
                <blockquote className="border-l-4 border-indigo-500 pl-4 italic my-4 text-black" {...props} />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default function AILawyer() {
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [stream, setStream] = useState<MediaStream>()
  const [debug, setDebug] = useState<string>()
  const [data, setData] = useState<StartAvatarResponse>()
  const mediaStream = useRef<HTMLVideoElement>(null)
  const avatar = useRef<StreamingAvatar | null>(null)
  const [chatMode, setChatMode] = useState("text_mode")
  const [isUserTalking, setIsUserTalking] = useState(false)
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [caseContent, setCaseContent] = useState('');

  const [transcript, setTranscript] = useState('')
  const [currOut, setcurrOut] = useState('')
  const [contextList, setcontextList] = useState([''])

  const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;


  // const tts = useTTS({
	// 	apiKey: CARTESIA_API_KEY != null ? CARTESIA_API_KEY : "",
	// 	sampleRate: 44100,
	// })
  // console.log(CARTESIA_API_KEY)

	// const [text, setText] = useState("");

	// const handleBuffer = async (input_text: string) => {
	// 	// Begin buffering the audio.
	// 	const response = await tts.buffer({
	// 		model_id: "sonic-english",
	// 		voice: {
  //       		mode: "id",
  //       		id: "a0e99841-438c-4a64-b679-ae501e7d6091",
  //       	},
	// 		transcript: input_text,
	// 	});

  //   console.log(response)

  //   await tts.play()

		// Immediately play the audio. (You can also buffer in advance and play later.)
	// }

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! I'm your AI lawyer. How can I help you today?", sender: 'ai' }
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      })
      const token = await response.text()
      console.log("Access Token:", token)
      return token
    } catch (error) {
      console.error("Error fetching access token:", error)
    }
  }

  async function startSession() {
    setIsLoadingSession(true)
    const newToken = await fetchAccessToken()
    avatar.current = new StreamingAvatar({
      //@ts-ignore
      token: newToken,
    })
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, async (e) => {
      console.log("Avatar started talking", e)
    })
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e)
    })
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected")
      endSession()
    })
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log(">>>>> Stream ready:", event.detail)
      setStream(event.detail)
    })
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      console.log(">>>>> User started talking:", event)
      setIsUserTalking(true)
    })
    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      console.log(">>>>> User stopped talking:", event)
      setIsUserTalking(false)
    })
    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: "37f4d912aa564663a1cf8d63acd0e1ab",
      })

      setData(res)
    } catch (error) {
      console.error("Error starting avatar session:", error)
    } finally {
      setIsLoadingSession(false)
    }
  }

  async function endSession() {
    await avatar.current?.stopAvatar()
    setStream(undefined)
  }

  useEffect(() => {
    return () => {
      endSession()
    }
  }, [])

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play()
        setDebug("Playing")
      }
    }
  }, [mediaStream, stream])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim()) {
      const userMessage = { id: messages.length + 1, text: inputMessage, sender: 'user' as const }
      setMessages(prevMessages => [...prevMessages, userMessage])
      setInputMessage("")
      
      setTimeout(() => {
        const aiResponse = { 
          id: messages.length + 2, 
          text: "Thank you for your message. I'm analyzing your case and will provide advice shortly. Is there anything else you'd like to add?", 
          sender: 'ai' as const 
        }
        setMessages(prevMessages => [...prevMessages, aiResponse])
      }, 1000)
    }
  }

  const toggleRecording = () => {
    if(!isRecording){
      setIsRecording(!isRecording)
    fetch('http://127.0.0.1:5000/api/record/start').then((response) => {
      console.log(response);
    })
    }
    else{
    setIsRecording(!isRecording)
    fetch('http://127.0.0.1:5000/api/record/stop')
    .then(async (response) => {
      const jsonData = await response.json();
      console.log(jsonData)
      return jsonData;
    })
    } 
  }

  const processInput = () => {
    let payload =
    {
      '$key': "bb-1u4b1z6p616x6i2z394pn15624w2si2f3o963r16681m3114i4",
      'context': [
        {
          'role': "user",
          "parts": [
            {
            "text": "transcript",
            }
          ]
        }
      ]
    }

    fetch('https://breadboard-community.wl.r.appspot.com/boards/@AdorableBeetle/prod-board-copy.bgl.api/run', 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },      
        body: JSON.stringify(payload),
      }
    ).then(async (response) => {
      console.log(response);
      const jsonData = await response.json();
      setcurrOut(jsonData.outputs)
      if(avatar.current){
        avatar.current.speak({text: jsonData.outputs, task_type: TaskType.REPEAT});
      }
    })
  }

  useEffect(() =>{
    fetch('http://127.0.0.1:5000/api/getBreadboard', 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'  // Specify that the body is JSON
        },      
        body: transcript,
      })
      .then(async (response) => {
        const jsonData = await response.json()
        console.log(jsonData)
        setcurrOut(jsonData['text'])
      })
      if(avatar.current){
        avatar.current.speak({text: currOut, task_type: TaskType.REPEAT});
      }
  }, [transcript])

  const testTts = async () => {
    if(avatar.current){
      avatar.current.speak({text: "Hi, how are you? I am your AI lawyer, and I can help answer your legal questions!", task_type: TaskType.REPEAT});
    }
  }

  const handleOpenPopup = async () => {
    const placeholderContent = `
### Client Information
- **Name**: John Doe
- **Age**: 35
- **Occupation**: Software Engineer

### Legal Issue
The client is facing a dispute with their employer regarding overtime pay and workplace discrimination.

### Key Points
1. Client has been working for the company for 5 years
2. Regularly works more than 40 hours per week without overtime compensation
3. Recently passed over for promotion, believes it's due to age discrimination

### Recommended Actions
1. Review employment contract and company policies
2. Gather documentation of hours worked and any communication regarding overtime
3. Collect evidence supporting the discrimination claim
4. Consider filing a complaint with the Equal Employment Opportunity Commission (EEOC)

### Next Steps
- Schedule a follow-up meeting to discuss gathered evidence
- Prepare for potential negotiation with the employer
- Explore options for alternative dispute resolution

Remember to keep all communication and documents confidential.
    `;
    
    setCaseContent(placeholderContent);
    setIsPopupOpen(true);
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-purple-100 to-indigo-200 flex flex-col">
      <nav className="bg-white shadow-md p-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center">
              <span className="font-bold text-xl text-indigo-600">CaseCraft</span>
            </div>
          </div>
        </div>
      </nav>
  
      <main className="flex-grow flex relative overflow-hidden">
        <div className="w-3/4 h-full flex flex-col items-center justify-center relative z-10">
          <Card className="w-full h-full overflow-hidden rounded-lg shadow-2xl" style={{
            background: 'linear-gradient(45deg, #6366f1, #a855f7, #ec4899)',
            padding: '1px',
          }}>
            <CardBody className="p-0 relative bg-white rounded-lg h-full">
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                className="w-full h-full object-cover object-center rounded-lg"
              >
                <track kind="captions" />
              </video>
              <div className="absolute bottom-4 left-4 flex flex-col items-center">
  <Button
    className="bg-purple-500 hover:bg-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center transition-colors duration-300 text-lg font-semibold shadow-lg hover:shadow-xl mb-4"
    size="sm"
    onClick={startSession}
  >
    S
  </Button>
  <Button
    className="bg-red-500 hover:bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
    size="sm"
    onClick={endSession}
  >
    E
  </Button>
</div>
              <div className="absolute bottom-4 right-4">
                <Button
                  className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full px-8 py-3 transition-colors duration-300 text-lg font-semibold shadow-lg hover:shadow-xl"
                  size="lg"
                  onClick={handleOpenPopup}
                >
                  View Case Summary
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
  
        <div className="w-1/4 flex flex-col overflow-hidden border-l border-indigo-200">
          <div className="flex-grow overflow-y-auto space-y-2 p-2 pt-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'ai' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`p-3 rounded-lg max-w-[90%] text-sm ${
                    message.sender === 'ai' 
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' 
                      : 'bg-white text-gray-800'
                  } shadow-md`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
  
      <div className="p-6 bg-white bg-opacity-50 backdrop-blur-md">
        <form onSubmit={handleSendMessage} className="flex items-center justify-center max-w-4xl mx-auto">
          <div className="relative mr-3">
            <button 
              type="button" 
              className={`transition-all duration-300 ease-in-out ${isRecording ? 'w-32 bg-red-500' : 'w-12 bg-indigo-600'} h-12 rounded-full flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              onClick={toggleRecording}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-2 h-4 bg-white rounded-full animate-pulse" style={{animationDelay: `${i * 0.15}s`}}></div>
                  ))}
                </div>
              ) : (
                <Mic size={24} />
              )}
            </button>
          </div>
          <input
            type="text"
            placeholder="Message AI Lawyer"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-grow mr-3 border-2 border-indigo-200 rounded-full py-3 px-6 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base"
          />
          
          <button 
            type="submit" 
            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-full px-8 py-3 transition-colors duration-300 text-base font-semibold"
          >
            Send
          </button>
        </form>
      </div>
  
      <CasePopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        content={caseContent}
      />
    </div>
  )
}