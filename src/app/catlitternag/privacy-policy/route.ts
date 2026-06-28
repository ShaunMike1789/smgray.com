import { legacyStaticResponse } from "@/lib/legacy-static";

export async function GET() {
  return legacyStaticResponse("catlitternag/privacy-policy/index.html");
}
