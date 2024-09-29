'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Upload, Mic, PauseCircle, StopCircle } from "lucide-react"
import { Card, CardBody, Button } from "@nextui-org/react"
import type { StartAvatarResponse } from "@heygen/streaming-avatar"
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
} from "@heygen/streaming-avatar"

interface Message {
  id: number
  text: string
  sender: 'ai' | 'user'
}

export default function AILawyer() {
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [stream, setStream] = useState<MediaStream>()
  const [debug, setDebug] = useState<string>()
  const [data, setData] = useState<StartAvatarResponse>()
  const [text, setText] = useState<string>("")
  const mediaStream = useRef<HTMLVideoElement>(null)
  const avatar = useRef<StreamingAvatar | null>(null)
  const [chatMode, setChatMode] = useState("text_mode")
  const [isUserTalking, setIsUserTalking] = useState(false)

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
    return ""
  }

  async function startSession() {
    setIsLoadingSession(true)
    const newToken = await fetchAccessToken()

    avatar.current = new StreamingAvatar({
      token: newToken,
    })
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
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
      await avatar.current?.startVoiceChat()
      setChatMode("voice_mode")
    } catch (error) {
      console.error("Error starting avatar session:", error)
    } finally {
      setIsLoadingSession(false)
    }
  }

  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized")
      return
    }
    await avatar.current
      .interrupt()
      .catch((e) => {
        setDebug(e.message)
      })
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
    setIsRecording(!isRecording)
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-purple-100 to-indigo-200 flex flex-col">
      <main className="flex-grow flex relative overflow-hidden">
        {/* Video Section */}
        <div className="w-3/4 h-full flex flex-col items-center justify-center relative z-10 p-4">
          <Card className="w-full h-full overflow-hidden border-4 border-indigo-300 rounded-lg shadow-xl">
            <CardBody className="p-0 relative">
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                className="w-full h-full object-cover object-center"
              >
                <track kind="captions" />
              </video>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                <Button
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-full px-8 py-3 transition-colors duration-300 text-lg font-semibold shadow-lg hover:shadow-xl mb-4"
                  size="lg"
                  onClick={startSession}
                >
                  Start Session
                </Button>
                <div className="flex gap-4">
                  <Button
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-full px-6 py-2 transition-all duration-300 flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-105"
                    size="sm"
                    onClick={handleInterrupt}
                  >
                    <PauseCircle size={16} />
                    <span>Interrupt</span>
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white rounded-full px-6 py-2 transition-all duration-300 flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-105"
                    size="sm"
                    onClick={endSession}
                  >
                    <StopCircle size={16} />
                    <span>End Session</span>
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Chat Section */}
        <div className="w-1/4 flex flex-col overflow-hidden border-l border-indigo-200">
          <div className="flex-grow overflow-y-auto space-y-2 p-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'ai' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`p-2 rounded-lg max-w-[90%] text-sm ${
                    message.sender === 'ai' 
                      ? 'bg-indigo-100 text-gray-800' 
                      : 'bg-purple-100 text-gray-800'
                  } shadow-sm`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Message Input Section */}
      <div className="p-4 bg-white bg-opacity-50 backdrop-blur-md">
        <form onSubmit={handleSendMessage} className="flex items-center justify-center max-w-3xl mx-auto">
          <div className="relative mr-2">
            <button 
              type="button" 
              className={`transition-all duration-300 ease-in-out ${isRecording ? 'w-24 bg-red-500' : 'w-8 bg-indigo-600'} h-8 rounded-full flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              onClick={toggleRecording}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-1 h-3 bg-white rounded-full animate-pulse" style={{animationDelay: `${i * 0.15}s`}}></div>
                  ))}
                </div>
              ) : (
                <Mic size={16} />
              )}
            </button>
          </div>
          <input
            type="text"
            placeholder="Message AI Lawyer"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-grow mr-2 border-2 border-indigo-200 rounded-full py-2 px-4 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
          />
          <button 
            type="button" 
            className="mr-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2 transition-colors duration-300"
            aria-label="Upload File"
          >
            <Upload size={20} />
          </button>
          <button 
            type="submit" 
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-full px-6 py-2 transition-colors duration-300 text-sm font-semibold"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}