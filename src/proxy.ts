import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher(["/tools(.*)", "/api/tools(.*)"]);

function authorizedEmails() {
  return new Set(
    (process.env.AUTHORIZED_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function claimEmails(sessionClaims: Record<string, unknown>) {
  const email =
    typeof sessionClaims.email === "string" ? sessionClaims.email : undefined;
  const primaryEmail =
    typeof sessionClaims.primary_email === "string"
      ? sessionClaims.primary_email
      : undefined;
  const emailAddress =
    typeof sessionClaims.email_address === "string"
      ? sessionClaims.email_address
      : undefined;

  return [email, primaryEmail, emailAddress]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
}

const protectedProxy = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    const authObject = await auth.protect();
    const allowed = authorizedEmails();

    if (allowed.size > 0) {
      const emails = claimEmails(authObject.sessionClaims);
      const isAllowed = emails.some((email) => allowed.has(email));

      if (!isAllowed) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }
  }
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (process.env.NEXT_PUBLIC_DISABLE_AUTH === "1") {
    return NextResponse.next();
  }

  return protectedProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|ttf|woff2?|map)).*)",
    "/(api|trpc)(.*)",
  ],
};
