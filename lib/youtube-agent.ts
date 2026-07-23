import ytdl from "@distube/ytdl-core";

export function getYoutubeAgent() {
  const cookiesStr = process.env.YOUTUBE_COOKIES;
  
  if (!cookiesStr) {
    return undefined; // use default agent without cookies
  }

  try {
    const cookies = JSON.parse(cookiesStr);
    return ytdl.createAgent(cookies);
  } catch (error) {
    console.error("Failed to parse YOUTUBE_COOKIES environment variable:", error);
    return undefined;
  }
}
