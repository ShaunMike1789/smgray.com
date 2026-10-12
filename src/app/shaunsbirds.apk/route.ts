const downloadUrl =
  "https://github.com/ShaunMike1789/smgray.com/releases/download/shauns-birds-v1.2.3-build228/ShaunsBirds-1.2.3-arm64.apk";

export function GET() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: downloadUrl,
      "Cache-Control": "public, max-age=300",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
