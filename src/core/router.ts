export type Intent = "music" | "chat" | "weather" | "schedule";

const MUSIC_KEYWORDS = /听歌|播放|来首|推荐|歌单|音乐|放首|来点|播首|放歌|听音乐|想听|来一首|放首歌|来首歌|点歌|唱首歌|唱歌|放个歌|来个歌|听个歌|有什么歌|有没有.*歌|适合|心情不好|来点.*音乐|放点.*歌/;
const WEATHER_KEYWORDS = /天气|下雨|温度|气温|晴|阴|雪/;
const SCHEDULE_KEYWORDS = /定时|提醒|每天|早上|晚上.*播|设置.*点/;

export function routeIntent(input: string): Intent {
  if (WEATHER_KEYWORDS.test(input)) return "weather";
  if (SCHEDULE_KEYWORDS.test(input)) return "schedule";
  if (MUSIC_KEYWORDS.test(input)) return "music";
  return "chat";
}
