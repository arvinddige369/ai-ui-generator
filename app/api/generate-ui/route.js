import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// In-memory store for rate limiting
const ipStore = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const limit = 2; // 2 requests
  const windowMs = 60 * 1000; // 1 minute

  if (!ipStore.has(ip)) {
    ipStore.set(ip, { count: 1, time: now });
    return true;
  }

  const data = ipStore.get(ip);

  if (now - data.time > windowMs) {
    ipStore.set(ip, { count: 1, time: now });
    return true;
  }

  if (data.count >= limit) {
    return false;
  }

  data.count++;
  return true;
}

export async function POST(req) {
  console.log("Origin:", req.headers.get("origin"));
  console.log("API Key Header:", req.headers.get("x-api-key"));
  console.log("Server API Key:", process.env.CLIENT_API_KEY);
  console.log("Auth Header:", req.headers.get("authorization"));
  console.log("Server Token:", process.env.SECURE_TOKEN);
  try {

    // -------------------------
    // ORIGIN SECURITY
    // -------------------------
    const origin = req.headers.get("origin");

    const allowedOrigins = [
      "http://localhost:3000",
      "https://ai-ui-generator-mtx.vercel.app"
    ];

    if (origin && !allowedOrigins.includes(origin)) {
      console.log("Blocked origin:", origin);

      return NextResponse.json(
        { error: "Unauthorized origin" },
        { status: 403 }
      );
    }

    // -------------------------
    // API KEY SECURITY
    // -------------------------
    const apiKey = req.headers.get("x-api-key");

    if (apiKey !== process.env.CLIENT_API_KEY) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // -------------------------
    // TOKEN PROTECTION
    // -------------------------
    const authHeader = req.headers.get("authorization");

    if (!authHeader || authHeader !== `Bearer ${process.env.SECURE_TOKEN}`) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 403 }
      );
    }

    // -------------------------
    // IP RATE LIMIT
    // -------------------------
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded (2 requests per minute)" },
        { status: 429 }
      );
    }

    // -------------------------
    // REQUEST BODY
    // -------------------------
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // -------------------------
    // PROMPT LENGTH PROTECTION
    // -------------------------
    if (prompt.length > 500) {
      return NextResponse.json(
        { error: "Prompt too long (max 500 characters)" },
        { status: 400 }
      );
    }

    // -------------------------
    // PROMPT ABUSE FILTER
    // -------------------------
    const blockedWords = [
      "hack",
      "malware",
      "exploit",
      "bypass",
      "illegal",
      "ddos"
    ];

    const isAbuse = blockedWords.some(word =>
      prompt.toLowerCase().includes(word)
    );

    if (isAbuse) {
      return NextResponse.json(
        { error: "Prompt contains restricted content" },
        { status: 400 }
      );
    }

    // -------------------------
    // OPENAI REQUEST
    // -------------------------
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content:
            "You generate clean React functional component code using TailwindCSS. Return only code."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const code = completion.choices[0].message.content;

    return NextResponse.json({ code });

  } catch (error) {

    console.error("API Error:", error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}