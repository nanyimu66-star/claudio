import axios from "axios";

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const response = await axios.post(
    "https://api.fish.audio/v1/tts",
    {
      text,
      reference_id: process.env.FISH_AUDIO_VOICE_ID,
      model: process.env.FISH_AUDIO_MODEL || "s2-pro",
      format: "mp3",
      sample_rate: 44100,
      mp3_bitrate: 128,
      normalize: true,
      prosody: {
        speed: Number(process.env.FISH_AUDIO_SPEED || 0.95),
        volume: 0,
        normalize_loudness: true,
      },
    },
    {
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${process.env.FISH_AUDIO_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );
  return Buffer.from(response.data);
}

export function hasTtsConfig() {
  return Boolean(process.env.FISH_AUDIO_API_KEY && process.env.FISH_AUDIO_VOICE_ID);
}
