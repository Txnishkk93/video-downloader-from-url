import ytdl from "@distube/ytdl-core";

function parseNetscapeCookies(cookieText: string) {
  const cookies: any[] = [];
  const lines = cookieText.split('\n');
  
  for (const line of lines) {
    if (!line || line.trim().startsWith('#') || line.trim() === '') continue;
    
    const parts = line.split('\t');
    if (parts.length !== 7) continue;
    
    cookies.push({
      domain: parts[0],
      path: parts[2],
      secure: parts[3] === 'TRUE',
      expirationDate: parseInt(parts[4], 10) || undefined,
      name: parts[5],
      value: parts[6].replace(/\r$/, '')
    });
  }
  return cookies;
}

export function getYoutubeAgent() {
  const cookiesStr = process.env.YOUTUBE_COOKIES;
  
  if (!cookiesStr) {
    return undefined; // use default agent without cookies
  }

  try {
    let cookies;
    if (cookiesStr.trim().startsWith('[')) {
      // Parse as JSON array
      cookies = JSON.parse(cookiesStr);
    } else {
      // Parse as Netscape format
      cookies = parseNetscapeCookies(cookiesStr);
    }
    return ytdl.createAgent(cookies);
  } catch (error) {
    console.error("Failed to parse YOUTUBE_COOKIES environment variable:", error);
    return undefined;
  }
}
