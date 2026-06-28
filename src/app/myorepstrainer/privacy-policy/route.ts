import { legacyStaticResponse } from "@/lib/legacy-static";

export async function GET() {
  return legacyStaticResponse("myorepstrainer/privacy-policy/index.html");
}
