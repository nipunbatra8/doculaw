import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const openaiModel = "gpt-4.1-nano";

if (!apiKey) {
  console.error("OpenAI API key is missing. Please check your environment variables.");
}

const openai = new OpenAI({ apiKey });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || !lastMessage.content) {
      return res.status(400).json({ error: 'No message content provided' });
    }

    const result = await openai.chat.completions.create({
      model: openaiModel,
      messages: [{ role: 'user', content: lastMessage.content }],
    });

    const text = result.choices[0]?.message?.content;

    if (!text) {
      return res.status(500).json({ error: 'No response from OpenAI' });
    }

    res.status(200).json({
      choices: [
        {
          message: {
            content: text,
          },
        },
      ],
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
}
