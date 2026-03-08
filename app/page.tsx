"use client";

import { useState } from "react";

export default function Home() {

  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const generateUI = async () => {
    try {

      setLoading(true);

      const res = await fetch("/api/generate-ui", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_CLIENT_KEY || "",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SECURE_TOKEN}`
        },
        body: JSON.stringify({ prompt })
      });

      const data = await res.json();

      setCode(data.code);

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-10">

      <h1 className="text-3xl font-bold mb-6">
        AI UI Generator
      </h1>

      <textarea
        className="border w-full p-3 h-32"
        placeholder="Describe your UI..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <button
        onClick={generateUI}
        className="bg-black text-white px-6 py-2 mt-4"
      >
        {loading ? "Generating..." : "Generate UI"}
      </button>

      {code && (
        <pre className="bg-gray-100 text-black p-4 mt-6 overflow-x-auto">
          {code}
        </pre>
      )}

    </main>
  );
}