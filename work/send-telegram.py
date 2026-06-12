import json
import mimetypes
import os
import re
import sys
import urllib.error
import urllib.request
import uuid


def call_json(url, payload):
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Telegram API error: {detail}") from None
    if not result.get("ok"):
        raise RuntimeError("Telegram rejected the request.")


def multipart(fields, file_field, file_path):
    boundary = uuid.uuid4().hex
    body = bytearray()
    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        body.extend(str(value).encode("utf-8"))
        body.extend(b"\r\n")

    filename = os.path.basename(file_path)
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(
        (
            f'Content-Disposition: form-data; name="{file_field}"; '
            f'filename="{filename}"\r\n'
        ).encode()
    )
    body.extend(f"Content-Type: {content_type}\r\n\r\n".encode())
    with open(file_path, "rb") as file:
        body.extend(file.read())
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode())
    return bytes(body), f"multipart/form-data; boundary={boundary}"


def send_document(url, chat_id, file_path, caption):
    body, content_type = multipart(
        {"chat_id": chat_id, "caption": caption},
        "document",
        file_path,
    )
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": content_type},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Telegram API error: {detail}") from None
    if not result.get("ok"):
        raise RuntimeError("Telegram rejected the document.")


def main():
    if len(sys.argv) != 2:
        raise RuntimeError("Payload file path is required.")
    token = os.environ.get("KGLD_TELEGRAM_TOKEN")
    if not token:
        raise RuntimeError("Telegram token is unavailable.")

    with open(sys.argv[1], "r", encoding="utf-8-sig") as file:
        payload = json.load(file)

    with open(payload["data_path"], "r", encoding="utf-8") as file:
        dashboard_data = file.read()

    def extract(pattern):
        match = re.search(pattern, dashboard_data)
        return match.group(1) if match else "-"

    updated_at = extract(r'updatedAt:\s*"([^"]+)"')
    status = extract(r'status:\s*"([^"]+)"')
    supply = extract(r'label:\s*"총공급량",\s*value:\s*"([^"]+)"')
    transfer_count = extract(r'label:\s*"24시간 전송",\s*value:\s*"([^"]+)"')
    minted = extract(r'label:\s*"발행",\s*value:\s*"([^"]+)"')
    burned = extract(r'label:\s*"소각",\s*value:\s*"([^"]+)"')
    issue_balance = extract(r'issue:\s*\{\s*value:\s*([0-9.]+)')
    redeem_balance = extract(r'redeem:\s*\{\s*value:\s*([0-9.]+)')

    message = (
        "KGLD Daily Onchain Dashboard\n\n"
        f"상태: {status}\n"
        f"총공급량: {supply} KGLD\n"
        f"24시간 전송: {transfer_count}건\n"
        f"발행 / 소각: {minted} / {burned} KGLD\n"
        f"Issue 보관: {issue_balance} KGLD\n"
        f"Redeem 보관: {redeem_balance} KGLD\n"
        f"기준: {updated_at}\n\n"
        "아래 버튼에서 컨트랙트를 바로 확인할 수 있습니다."
    )

    base_url = f"https://api.telegram.org/bot{token}"
    call_json(
        f"{base_url}/sendMessage",
        {
            "chat_id": payload["chat_id"],
            "text": message,
            "disable_web_page_preview": True,
            "reply_markup": {
                "inline_keyboard": [
                    [
                        {"text": "KGLD Token", "url": payload["links"]["token"]},
                        {"text": "Issue", "url": payload["links"]["issue"]},
                        {"text": "Redeem", "url": payload["links"]["redeem"]},
                    ]
                ]
            },
        },
    )
    send_document(
        f"{base_url}/sendDocument",
        payload["chat_id"],
        payload["image_path"],
        "원본 해상도 대시보드 PNG입니다. 파일을 열어 확대해서 확인하세요.",
    )
    send_document(
        f"{base_url}/sendDocument",
        payload["chat_id"],
        payload["bundle_path"],
        "인터랙티브 HTML 대시보드 묶음입니다. 압축을 풀고 index.html을 여세요.",
    )
    print("Telegram dashboard package sent successfully.")


if __name__ == "__main__":
    main()
