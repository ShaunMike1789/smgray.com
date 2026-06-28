import { legacyStaticResponse } from "@/lib/legacy-static";

export async function GET() {
  return legacyStaticResponse("img/smgray-favicon.png");
}
