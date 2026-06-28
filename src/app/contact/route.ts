import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

import { attemptsByIp } from "@/app/api/contact-state";

const MAX_CONTENT_LENGTH = 32 * 1024;
const RATE_WINDOW_SECONDS = Number(process.env.CONTACT_RATE_WINDOW_SECONDS ?? 900);
const RATE_MAX_ATTEMPTS = Number(process.env.CONTACT_RATE_MAX_ATTEMPTS ?? 5);

function env(name: string, defaultValue?: string) {
  const value = process.env[name] ?? defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function clientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",", 1)[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function rateLimited(ip: string) {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_SECONDS * 1000;
  const attempts = (attemptsByIp.get(ip) ?? []).filter((time) => time >= cutoff);

  if (attempts.length >= RATE_MAX_ATTEMPTS) {
    attemptsByIp.set(ip, attempts);
    return true;
  }

  attempts.push(now);
  attemptsByIp.set(ip, attempts);
  return false;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function wantsJson(request: Request) {
  return (
    request.headers.get("content-type")?.includes("application/json") ||
    request.headers.get("accept")?.includes("application/json")
  );
}

function response(request: Request, message: string, status = 200) {
  if (wantsJson(request)) {
    return Response.json({ message }, { status });
  }

  return new Response(
    [
      "<!doctype html><meta charset='utf-8'>",
      "<title>SMGray Contact</title>",
      `<p>${message.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</p>`,
      "<p><a href='/#contact'>Back to SMGray</a></p>",
    ].join(""),
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );
}

async function payload(request: Request) {
  const body = await request.text();

  if (body.length > MAX_CONTENT_LENGTH) {
    throw new Error("Payload too large");
  }

  if (request.headers.get("content-type")?.includes("application/json")) {
    return JSON.parse(body || "{}") as Record<string, string>;
  }

  return Object.fromEntries(new URLSearchParams(body)) as Record<string, string>;
}

export async function POST(request: Request) {
  let data: Record<string, string>;

  try {
    data = await payload(request);
  } catch {
    return response(request, "Please send a valid contact request.", 400);
  }

  if (data.company) {
    return response(request, "Thanks. Your message was received.");
  }

  const ip = clientIp(request);
  if (rateLimited(ip)) {
    return response(request, "Too many contact attempts. Please try again later.", 429);
  }

  const name = (data.name ?? "").trim();
  const email = (data.email ?? "").trim();
  const message = (data.message ?? "").trim();

  if (name.length < 2) {
    return response(request, "Please enter your name.", 400);
  }

  if (!isEmail(email)) {
    return response(request, "Please enter a valid email address.", 400);
  }

  if (message.length < 10) {
    return response(request, "Please enter a message.", 400);
  }

  const body = [
    "New message from smgray.com",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `IP: ${ip}`,
    "",
    message,
  ].join("\n");

  if (["1", "true", "yes"].includes((process.env.CONTACT_DRY_RUN ?? "").toLowerCase())) {
    console.info("CONTACT_DRY_RUN enabled; not sending SES email:\n%s", body);
    return response(request, "Thanks. Your message was sent.");
  }

  try {
    const region = process.env.AWS_REGION ?? "us-east-1";
    const subjectPrefix = process.env.CONTACT_SUBJECT_PREFIX ?? "SMGray contact";

    await new SESClient({ region }).send(
      new SendEmailCommand({
        Source: env("CONTACT_FROM_EMAIL"),
        Destination: {
          ToAddresses: [env("CONTACT_TO_EMAIL")],
        },
        ReplyToAddresses: [email],
        Message: {
          Subject: {
            Charset: "UTF-8",
            Data: `${subjectPrefix}: ${name}`,
          },
          Body: {
            Text: {
              Charset: "UTF-8",
              Data: body,
            },
          },
        },
      }),
    );
  } catch (error) {
    console.error("SES contact send failed", error);
    return response(request, "Sorry, the message could not be sent right now.", 502);
  }

  return response(request, "Thanks. Your message was sent.");
}
