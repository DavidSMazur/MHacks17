'use client'

import React, { useState } from 'react'
import { Upload, Mic, Sparkles } from "lucide-react"

interface Message {
  id: number
  text: string
  sender: 'ai' | 'user'
}

export default function AILawyer() {
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
        <div className={`transition-all duration-1000 ease-in-out ${isExpanded ? 'w-full' : 'w-2/3'} h-full flex flex-col items-center justify-center relative z-10`}>
          <div className="flex flex-col items-center">
            <div 
              className={`transition-all duration-1000 ease-in-out ${isExpanded ? 'scale-[100] opacity-0' : 'scale-100 opacity-100'} w-64 h-64 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 flex items-center justify-center text-6xl font-bold text-white cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105`}
              onClick={handleCircleClick}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleCircleClick()}
              aria-label="Expand case study"
            >
              AI
            </div>
            <h2 className={`transition-all duration-1000 ease-in-out ${isExpanded ? 'opacity-0' : 'opacity-100'} text-3xl font-semibold text-indigo-700 mt-8 flex items-center`}>
              Your AI Legal Assistant <Sparkles className="ml-2 text-yellow-400" />
            </h2>
          </div>
          <div 
            className={`transition-all duration-1000 ease-in-out ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'} absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center p-8 rounded-lg shadow-2xl`}
            aria-hidden={!isExpanded}
          >
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
        </div>
        {/* Dividing line */}
        <div className="w-px bg-indigo-200 self-stretch mx-4"></div>
        <div className={`transition-all duration-1000 ease-in-out ${isExpanded ? 'w-0 opacity-0' : 'w-1/3 opacity-100'} flex flex-col overflow-hidden`}>
          <div className="flex-grow overflow-y-auto space-y-4 mb-4 pr-4 pt-8"> {/* Added pt-8 for top padding */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg max-w-[80%] relative ${
                  message.sender === 'ai' 
                    ? 'bg-gradient-to-r from-purple-300 to-indigo-300 text-gray-800 self-start ml-2' 
                    : 'bg-white text-gray-800 self-end mr-2'
                } shadow-md`}
              >
                {message.text}
                <div 
                  className={`absolute top-1/2 -mt-2 w-0 h-0 border-8 ${
                    message.sender === 'ai'
                      ? 'border-r-purple-300 -left-2 border-t-transparent border-b-transparent border-l-transparent'
                      : 'border-l-white -right-2 border-t-transparent border-b-transparent border-r-transparent'
                  }`}
                ></div>
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