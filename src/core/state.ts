import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "state.db");

let db: Database.Database;

function getDb() {
  if (!db) {
    const fs = require("fs");
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id TEXT,
        title TEXT,
        artist TEXT,
        played_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS memory (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS likes (
        song_id TEXT PRIMARY KEY,
        title TEXT,
        artist TEXT,
        liked_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }
  return db;
}

export function addToHistory(song: { id: string; title: string; artist: string }) {
  getDb().prepare("INSERT INTO history (song_id, title, artist) VALUES (?, ?, ?)").run(song.id, song.title, song.artist);
}

export function getRecentHistory(limit = 10) {
  return getDb().prepare("SELECT * FROM history ORDER BY played_at DESC LIMIT ?").all(limit);
}

export function likeSong(song: { id: string; title: string; artist: string }) {
  getDb().prepare("INSERT OR IGNORE INTO likes (song_id, title, artist) VALUES (?, ?, ?)").run(song.id, song.title, song.artist);
}

export function getLikedSongs(limit = 20) {
  return getDb().prepare("SELECT * FROM likes ORDER BY liked_at DESC LIMIT ?").all(limit) as { song_id: string; title: string; artist: string; liked_at: string }[];
}

export function setMemory(key: string, value: string) {
  getDb().prepare("INSERT OR REPLACE INTO memory (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(key, value);
}

export function getMemory(key: string): string {
  const row = getDb().prepare("SELECT value FROM memory WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? "";
}
