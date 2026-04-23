const ALLOWED_HOST = "api.learnfromme.xyz";

/** Subset of Cloudflare KVNamespace used in this worker. */
interface KVNamespace {
  get(key: string): Promise<string | null>
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }>
}

export interface Env {
  EMAILS: KVNamespace
}

export default {
  async email(message: any, env: Env) {
    try {
      const to = message.to.toLowerCase();
      const from = message.from || "";
      const subject = message.headers.get("subject") || "";
      const time = new Date().toISOString();

      // ✅ ID
      const id = Date.now().toString();

      // =========================
      // ✅ BODY EXTRACTION
      // =========================
      let body = "No content";

      try {
        const rawText = await new Response(message.raw).text();

        const match = rawText.match(
          /Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)\r\n--/
        );

        if (match && match[1]) {
          body = match[1].trim();
        }
      } catch {}

      // =========================
      // ✅ ATTACHMENTS EXTRACTION
      // =========================
      let attachments = [];

try {
  const rawText = await new Response(message.raw).text();

  const parts = rawText.split("Content-Disposition: attachment");

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    const filenameMatch = part.match(/filename="(.+?)"/);
    const typeMatch = part.match(/Content-Type: (.+?);/);
    const base64Match = part.match(
      /Content-Transfer-Encoding: base64[\s\S]*?\r\n\r\n([\s\S]*?)\r\n--/
    );

    if (filenameMatch && base64Match) {
      let type = "application/octet-stream";
      if (filenameMatch[1].toLowerCase().endsWith(".pdf")) {
        type = "application/pdf";
      } else if (typeMatch) {
        type = typeMatch[1];
      }
      attachments.push({
        name: filenameMatch[1],
        type: type,
        content: base64Match[1].replace(/\r?\n|\r/g, "").trim(),
      });
    }
  }
} catch (err: any) {
  console.log("Attachment parse error", err);
}

      // =========================
      // ✅ EMAIL OBJECT
      // =========================
      const newEmail = {
        id,
        from,
        to,
        subject,
        body,
        time,
        deleted: false,
        attachments, // ✅ FIXED
      };

      let existing = await env.EMAILS.get(to);
      let emails = existing ? JSON.parse(existing) : [];

      emails.unshift(newEmail);

      await env.EMAILS.put(to, JSON.stringify(emails), {
        expirationTtl: 86400,
      });

    } catch (err: any) {
      console.log("Email error:", err);
    }
  },

  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (url.hostname !== ALLOWED_HOST) {
      return new Response("Forbidden", { status: 403 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // =========================
    // ✅ DELETE SINGLE EMAIL
    // =========================
    if (url.pathname === "/delete-message") {
      const email = url.searchParams.get("email")?.toLowerCase();
      const id = url.searchParams.get("id");

      if (!email || !id) {
        return new Response("Missing email or id", { status: 400 });
      }

      let existing = await env.EMAILS.get(email);
      let emails = existing ? JSON.parse(existing) : [];

      const updated = emails.map((e: any) =>
        String(e.id) === String(id)
          ? { ...e, deleted: true }
          : e
      );

      await env.EMAILS.put(email, JSON.stringify(updated), {
        expirationTtl: 86400,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // =========================
    // DELETE FULL INBOX
    // =========================
    if (url.pathname === "/delete") {
      const email = url.searchParams.get("email")?.toLowerCase();

      if (!email) {
        return new Response("Missing email", { status: 400 });
      }

      await env.EMAILS.delete(email);

      return new Response(JSON.stringify({ success: true }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // =========================
    // INBOX
    // =========================
    if (url.pathname === "/inbox") {
      const email = url.searchParams.get("email");

      const data = email
        ? await env.EMAILS.get(email.toLowerCase())
        : "[]";

      let parsed = JSON.parse(data || "[]");

      const filtered = parsed.filter((e: any) => !e.deleted);

      return new Response(JSON.stringify(filtered), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // =========================
    // EMAIL LIST
    // =========================
    if (url.pathname === "/emails") {
      const list = await env.EMAILS.list();
      const emails = list.keys.map((k: any) => k.name);

      return new Response(JSON.stringify(emails), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // =========================
    // STREAM
    // =========================
    if (url.pathname === "/stream") {
      const email = url.searchParams.get("email");

      const encoder = new TextEncoder();
      let interval: any;

      const stream = new ReadableStream({
        async start(controller) {
          async function sendData() {
            let data =
              (await env.EMAILS.get(email?.toLowerCase() as string)) || "[]";

            let emails = JSON.parse(data);

            const filtered = emails.filter((e: any) => !e.deleted);

            const msg =
              `event: inbox\n` +
              `data: ${JSON.stringify(filtered)}\n\n`;

            controller.enqueue(encoder.encode(msg));
          }

          await sendData();
          interval = setInterval(sendData, 3000);
        },

        cancel() {
          clearInterval(interval);
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    return new Response("OK", { headers: corsHeaders });
  },
};