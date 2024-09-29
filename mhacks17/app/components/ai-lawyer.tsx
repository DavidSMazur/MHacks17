'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Upload, Mic, Sparkles } from "lucide-react"
import { Card, CardBody, Button } from "@nextui-org/react"

import type { StartAvatarResponse } from "@heygen/streaming-avatar";

import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents, TaskType, VoiceEmotion,
} from "@heygen/streaming-avatar";

// import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";

// import {AVATARS, STT_LANGUAGE_LIST} from "@/app/lib/constants";


interface Message {
  id: number
  text: string
  sender: 'ai' | 'user'
}

export default function AILawyer() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>();
  const [knowledgeId, setKnowledgeId] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>("");
  const [language, setLanguage] = useState<string>('en');

  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [chatMode, setChatMode] = useState("text_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();

      console.log("Access Token:", token); // Log the token to verify

      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    }

    return "";
  }

  async function startSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();

    avatar.current = new StreamingAvatar({
      token: newToken,
    });
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e);
    });
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e);
    });
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected");
      endSession();
    });
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log(">>>>> Stream ready:", event.detail);
      setStream(event.detail);
    });
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      console.log(">>>>> User started talking:", event);
      setIsUserTalking(true);
    });
    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      console.log(">>>>> User stopped talking:", event);
      setIsUserTalking(false);
    });
    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: "37f4d912aa564663a1cf8d63acd0e1ab",
        // knowledgeId: knowledgeId, // Or use a custom `knowledgeBase`.
        // voice: {
        //   rate: 1.5, // 0.5 ~ 1.5
        //   emotion: VoiceEmotion.EXCITED,
        // },
        // language: language,
      });

      setData(res);
      // default to voice mode
      await avatar.current?.startVoiceChat();
      setChatMode("voice_mode");
    } catch (error) {
      console.error("Error starting avatar session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }
  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
    // speak({ text: text, task_type: TaskType.REPEAT })
    await avatar.current.speak({ text: text }).catch((e) => {
      setDebug(e.message);
    });
    setIsLoadingRepeat(false);
  }
  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
    await avatar.current
      .interrupt()
      .catch((e) => {
        setDebug(e.message);
      });
  }
  async function endSession() {
    await avatar.current?.stopAvatar();
    setStream(undefined);
  }

  // const handleChangeChatMode = useMemoizedFn(async (v) => {
  //   if (v === chatMode) {
  //     return;
  //   }
  //   if (v === "text_mode") {
  //     avatar.current?.closeVoiceChat();
  //   } else {
  //     await avatar.current?.startVoiceChat();
  //   }
  //   setChatMode(v);
  // });

  // const previousText = usePrevious(text);
  // useEffect(() => {
  //   if (!previousText && text) {
  //     avatar.current?.startListening();
  //   } else if (previousText && !text) {
  //     avatar?.current?.stopListening();
  //   }
  // }, [text, previousText]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
      };
    }
  }, [mediaStream, stream]);

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! I'm your AI lawyer. How can I help you today?", sender: 'ai' }
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

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

  const handleCircleClick = () => {
    setIsExpanded(true)
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-purple-100 to-indigo-200 flex flex-col">
      <main className="flex-grow flex relative overflow-hidden">
        <div className="w-1/2 h-full flex flex-col items-center justify-center relative z-10">
          <div className="flex flex-col items-center">
            <div 
              className="w-64 h-64 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 flex items-center justify-center text-6xl font-bold text-white cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              onClick={handleCircleClick}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleCircleClick()}
              aria-label="Expand case study"
            >
              AI
            </div>
            {/* <h2 className="text-3xl font-semibold text-indigo-700 mt-8 flex items-center">
              Your AI Legal Assistant <Sparkles className="ml-2 text-yellow-400" />
            </h2> */}
           <div className="w-full flex flex-col gap-4">
                  <Card>
                    <CardBody className="h-[500px] flex flex-col justify-center items-center">
                      <Button onClick={startSession}>Start Session</Button>
                      <div className="h-[500px] w-[900px] justify-center items-center flex rounded-lg overflow-hidden">
                        <video
                          ref={mediaStream}
                          autoPlay
                          playsInline
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        >
                          <track kind="captions" />
                        </video>
                        <div className="flex flex-col gap-2 absolute bottom-3 right-3">
                          <Button
                            className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                            size="md"
                            variant="shadow"
                            onClick={handleInterrupt}
                          >
                            Interrupt task
                          </Button>
                          <Button
                            className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                            size="md"
                            variant="shadow"
                            onClick={endSession}
                          >
                            End session
                          </Button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </div>
          {isExpanded && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center p-8 rounded-lg shadow-2xl">
              <div className="max-w-2xl w-full">
                <h3 className="text-2xl font-bold mb-4 text-indigo-700">Case Analysis</h3>
                <p className="text-gray-700 leading-relaxed">
                  Based on the information provided, here's a summary of your case:
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl nec ultricies lacinia, 
                  nunc nisl aliquam massa, eget aliquam nisl nunc vel lorem. Sed euismod, nisl vel aliquam aliquam, 
                  nunc nisl aliquam massa, eget aliquam nisl nunc vel lorem.
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
        <div className="w-px bg-indigo-200 self-stretch mx-4"></div>
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="flex-grow overflow-y-auto space-y-4 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'ai' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`p-3 rounded-lg max-w-[80%] ${
                    message.sender === 'ai' 
                      ? 'bg-indigo-100 text-gray-800' 
                      : 'bg-purple-100 text-gray-800'
                  } shadow-md`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <div className="p-4 bg-white bg-opacity-50 backdrop-blur-md">
        <form onSubmit={handleSendMessage} className="flex items-center justify-center max-w-3xl mx-auto">
          <div className="relative mr-2">
            <button 
              type="button" 
              className={`transition-all duration-300 ease-in-out ${isRecording ? 'w-32 bg-red-500' : 'w-10 bg-indigo-600'} h-10 rounded-full flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              onClick={toggleRecording}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-1 h-4 bg-white rounded-full animate-pulse" style={{animationDelay: `${i * 0.15}s`}}></div>
                  ))}
                </div>
              ) : (
                <Mic size={20} />
              )}
            </button>
          </div>
          <input
            type="text"
            placeholder="Message AI Lawyer"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-grow mr-2 border-2 border-indigo-200 rounded-full py-2 px-4 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button 
            type="button" 
            className="mr-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2 transition-colors duration-300"
            aria-label="Upload File"
          >
            <Upload size={24} />
          </button>
          <button 
            type="submit" 
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-full px-6 py-2 transition-colors duration-300"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
} 