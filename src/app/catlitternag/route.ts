import { legacyStaticResponse } from "@/lib/legacy-static";

export async function GET() {
  return legacyStaticResponse("catlitternag/index.html");
}
