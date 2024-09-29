// pages/api/chat.ts (or app/api/chat/route.ts for App Router)

import { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { messages } = req.body

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an AI lawyer assistant. Provide legal advice and information based on the user's queries." },
          ...messages,
        ],
      })

      res.status(200).json({ message: response.choices[0].message.content })
    } catch (error) {
      console.error('Error in chat API:', error)
      res.status(500).json({ error: 'Error generating AI response' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}