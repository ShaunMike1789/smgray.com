import html
import os
import time
from collections import defaultdict, deque
from email.utils import parseaddr

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from flask import Flask, jsonify, request, send_from_directory


app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024

RATE_WINDOW_SECONDS = int(os.getenv("CONTACT_RATE_WINDOW_SECONDS", "900"))
RATE_MAX_ATTEMPTS = int(os.getenv("CONTACT_RATE_MAX_ATTEMPTS", "5"))
_attempts_by_ip = defaultdict(deque)


def _env(name, default=None):
    value = os.getenv(name, default)
    if value is None or value == "":
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _client_ip():
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.remote_addr or "unknown"


def _rate_limited(ip):
    now = time.time()
    attempts = _attempts_by_ip[ip]
    while attempts and attempts[0] < now - RATE_WINDOW_SECONDS:
        attempts.popleft()
    if len(attempts) >= RATE_MAX_ATTEMPTS:
        return True
    attempts.append(now)
    return False


def _is_email(value):
    name, address = parseaddr(value or "")
    return bool(address and "@" in address and "." in address.rsplit("@", 1)[-1])


def _payload():
    if request.is_json:
        return request.get_json(silent=True) or {}
    return request.form.to_dict()


def _wants_json():
    return request.is_json or "application/json" in request.headers.get("Accept", "")


def _response(message, status=200):
    if _wants_json():
        return jsonify({"message": message}), status
    return (
        "<!doctype html><meta charset='utf-8'>"
        "<title>SMGray Contact</title>"
        f"<p>{html.escape(message)}</p>"
        "<p><a href='/#contact'>Back to SMGray</a></p>",
        status,
        {"Content-Type": "text/html; charset=utf-8"},
    )


@app.get("/")
def index():
    return send_from_directory(".", "index.html")


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/img/<path:path>")
def images(path):
    return send_from_directory("img", path)


@app.get("/myorepstrainer/privacy-policy/")
def myoreps_privacy_policy():
    return send_from_directory("myorepstrainer/privacy-policy", "index.html")


@app.post("/contact")
def contact():
    data = _payload()

    if data.get("company"):
        return _response("Thanks. Your message was received.")

    ip = _client_ip()
    if _rate_limited(ip):
        return _response("Too many contact attempts. Please try again later.", 429)

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()

    if len(name) < 2:
        return _response("Please enter your name.", 400)
    if not _is_email(email):
        return _response("Please enter a valid email address.", 400)
    if len(message) < 10:
        return _response("Please enter a message.", 400)

    body = "\n".join(
        [
            "New message from smgray.com",
            "",
            f"Name: {name}",
            f"Email: {email}",
            f"IP: {ip}",
            "",
            message,
        ]
    )

    if os.getenv("CONTACT_DRY_RUN", "").lower() in {"1", "true", "yes"}:
        app.logger.info("CONTACT_DRY_RUN enabled; not sending SES email:\n%s", body)
        return _response("Thanks. Your message was sent.")

    to_email = _env("CONTACT_TO_EMAIL")
    from_email = _env("CONTACT_FROM_EMAIL")
    reply_to = email
    region = os.getenv("AWS_REGION", "us-east-1")
    subject_prefix = os.getenv("CONTACT_SUBJECT_PREFIX", "SMGray contact")

    try:
        boto3.client("ses", region_name=region).send_email(
            Source=from_email,
            Destination={"ToAddresses": [to_email]},
            ReplyToAddresses=[reply_to],
            Message={
                "Subject": {"Data": f"{subject_prefix}: {name}", "Charset": "UTF-8"},
                "Body": {"Text": {"Data": body, "Charset": "UTF-8"}},
            },
        )
    except (BotoCoreError, ClientError):
        app.logger.exception("SES contact send failed")
        return _response("Sorry, the message could not be sent right now.", 502)

    return _response("Thanks. Your message was sent.")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
