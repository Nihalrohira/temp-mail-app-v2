/**
 * Extract display body from MIME `raw` (same idea as `new Response(message.raw).text()`).
 */
export function parseBodyFromRaw(messageRaw: unknown): string {
  let body = "No content"

  try {
    const rawText = toRawString(messageRaw)
    if (!rawText) {
      return body
    }

    // Normalize to CRLF so the MIME part regexes match reliably
    const raw = rawText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n/g, "\r\n")

    let plainMatch = raw.match(
      /Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)\r\n--/
    )

    if (plainMatch && plainMatch[1]) {
      body = plainMatch[1].trim()
    } else {
      let htmlMatch = raw.match(
        /Content-Type: text\/html[\s\S]*?\r\n\r\n([\s\S]*?)\r\n--/
      )

      if (htmlMatch && htmlMatch[1]) {
        let html = htmlMatch[1]

        html = html.replace(/=\r?\n/g, "")
        html = html.replace(/=([A-F0-9]{2})/gi, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        )

        body = html
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim()
      }
    }
  } catch (err) {
    console.log("Body parse error:", err)
  }

  return body
}

function toRawString(messageRaw: unknown): string {
  if (messageRaw == null) return ""
  if (typeof messageRaw === "string") return messageRaw
  if (messageRaw instanceof ArrayBuffer) {
    return new TextDecoder("utf-8", { fatal: false }).decode(messageRaw)
  }
  if (ArrayBuffer.isView(messageRaw as ArrayBufferView)) {
    return new TextDecoder("utf-8", { fatal: false }).decode(
      messageRaw as ArrayBufferView
    )
  }
  return String(messageRaw)
}
