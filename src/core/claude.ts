import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./context";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

const MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

export type Message = { role: "user" | "assistant"; content: string };

export async function streamChat(messages: Message[], onChunk: (text: string) => void): Promise<string> {
  const system = buildSystemPrompt();
  let full = "";

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 8192,
    system,
    messages,
  });

  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      full += chunk.delta.text;
      onChunk(chunk.delta.text);
    }
  }

  return full;
}

export async function generatePlaylistJson(userInput: string): Promise<{
  intro: string;
  songs: { title: string; artist: string; mood: string }[];
}> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 900,
    system: `你是一个 AI 电台策划人。根据用户描述生成歌单，输出纯 JSON，不要任何额外文字：
{"intro":"电台口播开场白，40字以内","songs":[{"title":"歌名","artist":"歌手","mood":"气质标签"}]}`,
    messages: [{ role: "user", content: userInput }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "{}";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Invalid JSON from model");
  return JSON.parse(match[0]);
}
