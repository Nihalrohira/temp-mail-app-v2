/**
 * Temp Mail — user UI
 * Session JSON in localStorage (email, createdAt, expiresAt); 24h TTL.
 * Inbox: Cloudflare Worker returns messages for the requested address only.
 */

let eventSource = null;
let isReconnecting = false;
const seenEmails = new Set();
let seenEmailsInboxNorm = "";
let seenEmailIds = new Set();

document.addEventListener("DOMContentLoaded", function () {
  const API_BASE = "https://api.learnfromme.xyz";
  const API_INBOX_BASE = API_BASE + "/inbox";

  function inboxUrlForEmail(email) {
    return (
      API_INBOX_BASE +
      "?email=" +
      encodeURIComponent(String(email || "").trim())
    );
  }

  function deleteUrlForEmail(email) {
    return (
      API_BASE +
      "/delete?email=" +
      encodeURIComponent(String(email || "").trim())
    );
  }

  const STORAGE_SESSION_KEY = "tempmail_session";
  const LEGACY_EMAIL_KEY = "tempmail_active_email";
  const LEGACY_CREATED_KEY = "tempmail_active_created";

  const TTL_MS = 24 * 60 * 60 * 1000;

  let sessionExpiredBanner = false;

  const NEW_HIGHLIGHT_MS = 5000;

  let inboxBaselineIds = new Set();
  let inboxInitialized = false;
  let newHighlightTimers = {};
  let loadEmailsSeq = 0;
  /** Aborts the previous inbox fetch when a new one starts (avoids stale errors). */
  let loadEmailsAbort = null;
  let newEmailNoticeTimer = null;
  let copySuccessTimer = null;

  /** Normalized address for the active SSE subscription (dedupe / stale guards). */
  let sseStreamEmailNorm = "";

  const els = {
    generatedEmail: document.getElementById("generatedEmail"),
    copyBtn: document.getElementById("copyBtn"),
    generateEmail: document.getElementById("generateEmail"),
    refreshInbox: document.getElementById("refreshInbox"),
    deleteEmail: document.getElementById("deleteEmail"),
    emails: document.getElementById("emails"),
    lastCheckedLine: document.getElementById("lastCheckedLine"),
    pollHintLine: document.getElementById("pollHintLine"),
    connectionStatusLine: document.getElementById("connectionStatusLine"),
    newEmailCounter: document.getElementById("newEmailCounter"),
  };

  function formatClockHms() {
    const d = new Date();
    const pad = function (n) {
      return String(n).padStart(2, "0");
    };
    return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function updateLastCheckedLine() {
    if (!els.lastCheckedLine) return;
    els.lastCheckedLine.textContent = "Last checked: " + formatClockHms();
  }

  function showConnectionLostStrip() {
    if (!els.connectionStatusLine) return;
    els.connectionStatusLine.textContent = "Connection lost. Retrying...";
    els.connectionStatusLine.removeAttribute("aria-hidden");
    els.connectionStatusLine.hidden = false;
  }

  function hideConnectionLostStrip() {
    if (!els.connectionStatusLine) return;
    els.connectionStatusLine.hidden = true;
    els.connectionStatusLine.setAttribute("aria-hidden", "true");
  }

  function showNewEmailsNotice(count) {
    if (!els.newEmailCounter || count < 1) return;
    if (newEmailNoticeTimer) clearTimeout(newEmailNoticeTimer);
    els.newEmailCounter.hidden = false;
    els.newEmailCounter.textContent =
      "(" +
      count +
      " new email" +
      (count === 1 ? "" : "s") +
      ")";
    newEmailNoticeTimer = window.setTimeout(function () {
      newEmailNoticeTimer = null;
      if (els.newEmailCounter) {
        els.newEmailCounter.hidden = true;
        els.newEmailCounter.textContent = "";
      }
    }, 5000);
  }

  function initButtonDefaultLabels() {
    [
      els.copyBtn,
      els.generateEmail,
      els.refreshInbox,
      els.deleteEmail,
    ].forEach(function (btn) {
      if (!btn) return;
      var label = btn.querySelector(".btn-label");
      if (label) btn.dataset.defaultLabel = label.textContent;
    });
  }

  function setButtonLoading(btn, loading, loadingText) {
    if (!btn) return;
    var label = btn.querySelector(".btn-label");
    if (loading) {
      btn.disabled = true;
      btn.classList.add("is-loading");
      if (label) label.textContent = loadingText;
    } else {
      btn.disabled = false;
      btn.classList.remove("is-loading");
      if (label) label.textContent = btn.dataset.defaultLabel || "";
    }
  }

  function normalizeAddress(addr) {
    return String(addr || "")
      .trim()
      .toLowerCase();
  }

  const ALLOWED_INBOX_SUFFIX = "@learnfromme.xyz";

  /** Local @learnfromme.xyz addresses only (trimmed, case-insensitive domain). */
  function isAllowedInboxEmail(raw) {
    const s = String(raw || "").trim();
    if (!s || s.indexOf("@") === -1) return false;
    const lower = s.toLowerCase();
    if (!lower.endsWith(ALLOWED_INBOX_SUFFIX)) return false;
    if (lower.length <= ALLOWED_INBOX_SUFFIX.length) return false;
    return true;
  }

  function clearSessionStorageKeys() {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem(LEGACY_EMAIL_KEY);
    localStorage.removeItem(LEGACY_CREATED_KEY);
  }

  function migrateLegacySession() {
    if (localStorage.getItem(STORAGE_SESSION_KEY)) return;
    const oldEmail = localStorage.getItem(LEGACY_EMAIL_KEY);
    if (!oldEmail) return;
    const oldCreated = localStorage.getItem(LEGACY_CREATED_KEY);
    const createdMs = oldCreated ? new Date(oldCreated).getTime() : NaN;
    const createdAt = Number.isFinite(createdMs) ? createdMs : Date.now();
    localStorage.setItem(
      STORAGE_SESSION_KEY,
      JSON.stringify({
        email: String(oldEmail).trim(),
        createdAt: createdAt,
        expiresAt: createdAt + TTL_MS,
      })
    );
    localStorage.removeItem(LEGACY_EMAIL_KEY);
    localStorage.removeItem(LEGACY_CREATED_KEY);
  }

  function clearAllHighlightTimers() {
    Object.keys(newHighlightTimers).forEach(function (id) {
      clearTimeout(newHighlightTimers[id]);
    });
    newHighlightTimers = {};
  }

  function resetInboxTracking() {
    clearAllHighlightTimers();
    inboxBaselineIds = new Set();
    inboxInitialized = false;
    if (newEmailNoticeTimer) {
      clearTimeout(newEmailNoticeTimer);
      newEmailNoticeTimer = null;
    }
    if (els.newEmailCounter) {
      els.newEmailCounter.hidden = true;
      els.newEmailCounter.textContent = "";
    }
  }

  function clearSession() {
    stopInboxStream();
    clearSessionStorageKeys();
    els.generatedEmail.value = "";
    resetInboxTracking();
    sessionExpiredBanner = false;
  }

  function persistSession(address) {
    stopInboxStream();
    resetInboxTracking();
    sessionExpiredBanner = false;
    const createdAt = Date.now();
    const expiresAt = createdAt + TTL_MS;
    localStorage.setItem(
      STORAGE_SESSION_KEY,
      JSON.stringify({
        email: address,
        createdAt: createdAt,
        expiresAt: expiresAt,
      })
    );
    els.generatedEmail.value = address;
  }

  /**
   * Restore session from localStorage or clear if missing / invalid / expired.
   * Returns normalized active address or "".
   */
  function syncSessionFromStorage() {
    migrateLegacySession();
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) {
      els.generatedEmail.value = "";
      return "";
    }
    let obj;
    try {
      obj = JSON.parse(raw);
    } catch {
      clearSessionStorageKeys();
      els.generatedEmail.value = "";
      return "";
    }
    if (!obj || typeof obj !== "object") {
      clearSessionStorageKeys();
      els.generatedEmail.value = "";
      return "";
    }
    const email = String(obj.email || "").trim();
    const expiresAt = Number(obj.expiresAt);
    if (!email || !Number.isFinite(expiresAt)) {
      clearSessionStorageKeys();
      els.generatedEmail.value = "";
      return "";
    }
    if (Date.now() > expiresAt) {
      clearSessionStorageKeys();
      els.generatedEmail.value = "";
      resetInboxTracking();
      sessionExpiredBanner = true;
      return "";
    }
    sessionExpiredBanner = false;
    els.generatedEmail.value = email;
    return normalizeAddress(email);
  }

  function generateRandomEmail() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let name = "";
    for (let i = 0; i < 8; i++) {
      name += chars[Math.floor(Math.random() * chars.length)];
    }
    return name + "@learnfromme.xyz";
  }

  function parseFromField(from) {
    let fromEmail = from || "Unknown";
    try {
      if (typeof fromEmail === "string" && fromEmail.includes("{")) {
        const parsed = JSON.parse(fromEmail);
        fromEmail = parsed.email || fromEmail;
      }
    } catch {
      /* keep string */
    }
    return fromEmail;
  }

  function formatTime(timeVal) {
    if (!timeVal) return "";
    const d = new Date(timeVal);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
  }

  /** Prefer id from API; stable fallback from worker payload fields. */
  function getMessageId(row) {
    if (!row) return "";
    const raw =
      row.id ||
      row.messageId ||
      row.message_id ||
      row["MessageID"] ||
      row["MessageId"];
    if (raw != null && String(raw).trim() !== "") {
      return "mid:" + String(raw).trim();
    }
    const t = String(row.time || row["Time"] || "");
    const to = normalizeAddress(row.to || row["To"] || "");
    const from = String(row.from || row["From"] || "");
    const sub = String(row.subject || row["Subject"] || "");
    const body = String(row.body || row["Body"] || "").slice(0, 120);
    return "row:" + [t, to, from, sub, body].join("|");
  }

  /** Stable key for SSE / repeated full-inbox dedupe (per user: use message time). */
  function inboxTimeKey(row) {
    if (!row) return "";
    const t = row.time != null ? row.time : row["Time"];
    return String(t || "");
  }

  /** Worker already scopes by email; sort newest first and dedupe. */
  function dedupeSortInbox(data) {
    if (!Array.isArray(data)) return [];
    const sorted = data
      .filter(Boolean)
      .sort(function (a, b) {
        return (
          new Date(b.time || b["Time"] || 0) -
          new Date(a.time || a["Time"] || 0)
        );
      });
    const seen = new Set();
    const out = [];
    sorted.forEach(function (row) {
      const id = getMessageId(row);
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push(row);
    });
    return out;
  }

  function computeNewMessageIds(filtered) {
    const set = new Set();
    if (!inboxInitialized) return set;
    filtered.forEach(function (row) {
      const id = getMessageId(row);
      if (id && !inboxBaselineIds.has(id)) set.add(id);
    });
    return set;
  }

  function clearNewHighlightTimer(id) {
    if (newHighlightTimers[id]) {
      clearTimeout(newHighlightTimers[id]);
      newHighlightTimers[id] = null;
    }
  }

  function removeNewHighlight(card, addReadState) {
    if (!card) return;
    const id = card.dataset.messageId;
    if (id) clearNewHighlightTimer(id);
    card.classList.remove("email-card--new", "email-card--animate-in");
    const badge = card.querySelector(".email-badge--new");
    if (badge) badge.remove();
    if (addReadState) card.classList.add("email-card--read");
  }

  function scheduleNewHighlightExpiry(messageId) {
    if (!messageId) return;
    clearNewHighlightTimer(messageId);
    newHighlightTimers[messageId] = window.setTimeout(function () {
      newHighlightTimers[messageId] = null;
      const card = Array.prototype.find.call(
        els.emails.querySelectorAll(".email-card[data-message-id]"),
        function (c) {
          return c.dataset.messageId === messageId;
        }
      );
      removeNewHighlight(card, false);
    }, NEW_HIGHLIGHT_MS);
  }

  function createEmailCard(email, isNewArrival) {
    const card = document.createElement("div");
    card.className = "email-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.dataset.messageId = getMessageId(email);
    card.dataset.inboxTime = inboxTimeKey(email);

    if (isNewArrival) {
      card.classList.add("email-card--new", "email-card--animate-in");
    }

    const fromRaw = email.from != null ? email.from : email["From"];
    const timeRaw = email.time != null ? email.time : email["Time"];
    const subjRaw =
      email.subject != null ? email.subject : email["Subject"];
    const bodyRaw = email.body != null ? email.body : email["Body"];

    const fromEmail = parseFromField(fromRaw);
    const formattedDate = formatTime(timeRaw);

    const head = document.createElement("div");
    head.className = "email-card__head";

    const subjectEl = document.createElement("b");
    subjectEl.className = "email-card__subject";
    subjectEl.textContent = subjRaw || "No Subject";

    head.appendChild(subjectEl);
    if (isNewArrival) {
      const badge = document.createElement("span");
      badge.className = "email-badge email-badge--new";
      badge.textContent = "New";
      head.appendChild(badge);
    }

    const meta = document.createElement("div");
    meta.className = "email-card__meta";
    let metaHtml =
      "<small><b>From:</b> " +
      escapeHtml(String(fromEmail)) +
      "</small><br>" +
      "<small>" +
      escapeHtml(formattedDate) +
      "</small>";
    if (email.hasAttachment === true) {
      metaHtml += "<br><small>📎 Attachment</small>";
    }
    meta.innerHTML = metaHtml;

    const detail = document.createElement("div");
    detail.className = "email-body";
    detail.textContent = bodyRaw || "";

    card.appendChild(head);
    card.appendChild(meta);
    card.appendChild(detail);

    card.addEventListener("click", function (ev) {
      ev.stopPropagation();
      removeNewHighlight(card, true);
      const open = detail.classList.toggle("is-open");
      card.setAttribute("aria-expanded", open ? "true" : "false");
    });

    card.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        card.click();
      }
    });

    return card;
  }

  function renderInbox(data, activeEmail, options) {
    options = options || {};
    const silent = options.silent === true;
    const container = els.emails;

    if (!Array.isArray(data)) {
      if (!silent) {
        container.className = "";
        container.textContent = "Invalid API response";
        resetInboxTracking();
      }
      return;
    }

    const active = normalizeAddress(activeEmail);

    if (!active) {
      resetInboxTracking();
      seenEmails.clear();
      seenEmailsInboxNorm = "";
      if (sessionExpiredBanner) {
        container.className = "inbox-expired";
        container.textContent = "Email expired. Generate a new one.";
        return;
      }
      container.className = "inbox-hint";
      container.textContent =
        "Click Generate to create a temporary email";
      return;
    }

    if (seenEmailsInboxNorm !== active) {
      seenEmails.clear();
      seenEmailsInboxNorm = active;
    }

    const filtered = dedupeSortInbox(data);

    if (filtered.length === 0) {
      clearAllHighlightTimers();
      seenEmails.clear();
      container.className = "inbox-empty";
      container.textContent = "Waiting for incoming emails...";
      inboxBaselineIds = new Set();
      inboxInitialized = true;
      return;
    }

    const timeDeduped = [];
    const timesInPayload = new Set();
    filtered.forEach(function (row) {
      const tk = inboxTimeKey(row);
      if (tk && timesInPayload.has(tk)) return;
      if (tk) timesInPayload.add(tk);
      timeDeduped.push(row);
    });

    const newIdSet = computeNewMessageIds(timeDeduped);

    const hadList =
      container.className === "" &&
      container.querySelector(".email-card[data-message-id]") != null;
    const shouldKeyedUpdate = silent && hadList;

    container.className = "";

    if (!shouldKeyedUpdate) {
      container.innerHTML = "";
      seenEmails.clear();
      timeDeduped.forEach(function (row) {
        const tk = inboxTimeKey(row);
        if (tk && seenEmails.has(tk)) return;
        const id = getMessageId(row);
        const isNewArrival = newIdSet.has(id);
        const card = createEmailCard(row, isNewArrival);
        container.appendChild(card);
        if (tk) seenEmails.add(tk);
        if (isNewArrival) scheduleNewHighlightExpiry(id);
      });
    } else {
      const existingById = new Map();
      Array.prototype.forEach.call(
        container.querySelectorAll(".email-card[data-message-id]"),
        function (c) {
          existingById.set(c.dataset.messageId, c);
        }
      );
      const keepIds = new Set();
      timeDeduped.forEach(function (row) {
        const id = getMessageId(row);
        const tk = inboxTimeKey(row);
        let card = existingById.get(id);
        if (card) {
          container.appendChild(card);
          keepIds.add(id);
          return;
        }
        if (tk && seenEmails.has(tk)) {
          const alt = Array.prototype.find.call(
            container.querySelectorAll(".email-card[data-inbox-time]"),
            function (c) {
              return c.dataset.inboxTime === tk;
            }
          );
          if (alt) {
            container.appendChild(alt);
            keepIds.add(alt.dataset.messageId);
            return;
          }
        }
        const isNewArrival = newIdSet.has(id);
        card = createEmailCard(row, isNewArrival);
        container.appendChild(card);
        if (tk) seenEmails.add(tk);
        keepIds.add(id);
        if (isNewArrival) scheduleNewHighlightExpiry(id);
      });
      existingById.forEach(function (card, id) {
        if (!keepIds.has(id)) {
          clearNewHighlightTimer(id);
          card.remove();
        }
      });
    }

    timeDeduped.forEach(function (row) {
      const id = getMessageId(row);
      if (id) inboxBaselineIds.add(id);
    });
    inboxInitialized = true;

    if (newIdSet.size > 0) {
      showNewEmailsNotice(newIdSet.size);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function stopInboxStream() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    sseStreamEmailNorm = "";
  }

  /**
   * One EventSource at a time; closes any previous instance first.
   * Worker emits `event: inbox` (see startStream); default `message` is also handled.
   */
  function startStream(email) {
    if (eventSource) {
      eventSource.close();
    }
    eventSource = null;

    email = String(email || "").trim();
    const boundNorm = normalizeAddress(email);

    eventSource = new EventSource(`${API_BASE}/stream?email=${email}`);

    function handleSseData(dataStr) {
      if (normalizeAddress(els.generatedEmail.value) !== boundNorm) return;
      try {
        const data = JSON.parse(dataStr);
        if (!Array.isArray(data)) return;
        const currentEmail = els.generatedEmail.value.trim();

        let hasNewEmail = false;
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (!row) continue;

          const id = getMessageId(row);
          if (!id) continue;

          if (!seenEmailIds.has(id)) {
            seenEmailIds.add(id);
            hasNewEmail = true;
          }
        }

        if (hasNewEmail) {
          posthog.capture('email_received', {
            email: currentEmail
          });
        }
        updateLastCheckedLine();
        hideConnectionLostStrip();
        renderInbox(data, boundNorm, { silent: true });
      } catch (e) {
        console.error("Parse error", e);
      }
    }

    eventSource.onmessage = function (event) {
      handleSseData(event.data);
    };

    eventSource.addEventListener("inbox", function (event) {
      handleSseData(event.data);
    });

    eventSource.onopen = function () {
      isReconnecting = false;
      hideConnectionLostStrip();
    };

    eventSource.onerror = function () {
      console.log("SSE reconnecting...");
      if (isReconnecting) return;
      isReconnecting = true;

      showConnectionLostStrip();

      if (eventSource) {
        try {
          eventSource.close();
        } catch (e) {
          /* ignore */
        }
        eventSource = null;
      }

      window.setTimeout(function () {
        if (document.visibilityState === "visible") {
          connectInboxSse();
        }
        isReconnecting = false;
      }, 2000);
    };

    sseStreamEmailNorm = boundNorm;
  }

  /**
   * Start SSE when tab is visible and session has a valid inbox address.
   * Skips opening a duplicate connection for the same email while OPEN/CONNECTING.
   */
  function connectInboxSse() {
    syncSessionFromStorage();
    const raw = els.generatedEmail.value.trim();
    const norm = normalizeAddress(raw);

    if (!norm || !isAllowedInboxEmail(raw)) {
      stopInboxStream();
      return;
    }

    if (document.visibilityState !== "visible") {
      stopInboxStream();
      return;
    }

    if (typeof window.EventSource === "undefined") {
      return;
    }

    if (
      eventSource &&
      sseStreamEmailNorm === norm &&
      (eventSource.readyState === EventSource.OPEN ||
        eventSource.readyState === EventSource.CONNECTING)
    ) {
      return;
    }

    startStream(raw);
  }

  function loadEmails(loadOptions) {
    loadOptions = loadOptions || {};
    const silent = loadOptions.silent === true;
    const seq = ++loadEmailsSeq;

    syncSessionFromStorage();
    const activeRaw = els.generatedEmail.value.trim();
    const current = normalizeAddress(activeRaw);

    if (!current) {
      if (loadEmailsAbort) {
        loadEmailsAbort.abort();
        loadEmailsAbort = null;
      }
      renderInbox([], "", { silent: silent });
      return Promise.resolve();
    }

    if (!isAllowedInboxEmail(activeRaw)) {
      if (loadEmailsAbort) {
        loadEmailsAbort.abort();
        loadEmailsAbort = null;
      }
      resetInboxTracking();
      els.emails.className = "";
      els.emails.textContent = "Invalid email address";
      return Promise.resolve();
    }

    if (loadEmailsAbort) {
      loadEmailsAbort.abort();
    }
    loadEmailsAbort = new AbortController();
    const signal = loadEmailsAbort.signal;
    const thisAbort = loadEmailsAbort;

    if (!silent) {
        els.emails.className = "inbox-hint";
        els.emails.textContent = "Loading…";
    }

    return fetch(inboxUrlForEmail(current) + "&t=" + Date.now(), {
      signal: signal,
      cache: "no-store",
    })
      .then(async function (res) {
        console.log("API status:", res.status);
        if (!res.ok) {
          throw new Error("HTTP error: " + res.status);
        }
        let data;
        try {
          data = await res.json();
        } catch (e) {
          console.error("JSON parse failed:", e);
          throw new Error("Invalid JSON response");
        }
        if (!Array.isArray(data)) {
          console.warn("Unexpected data format:", data);
          throw new Error("Invalid API response");
        }
        return data;
      })
      .then(function (data) {
        if (seq !== loadEmailsSeq) return;
        try {
          updateLastCheckedLine();
          hideConnectionLostStrip();
          const cur = normalizeAddress(els.generatedEmail.value);
          renderInbox(data, cur, { silent: silent });
        } catch (e) {
          console.error("Inbox render failed:", e);
          if (!silent) {
            els.emails.className = "";
            els.emails.textContent = "Error displaying emails";
          }
        }
      })
      .catch(function (err) {
        if (err.name === "AbortError") {
          console.log("Request aborted (normal behavior)");
          throw err;
        }

        if (seq !== loadEmailsSeq) {
          return;
        }

        console.error("Real fetch error:", err);

        showConnectionLostStrip();
        if (!silent) {
          els.emails.className = "";
          els.emails.textContent = "Error loading emails";
        }

        throw err;
      })
      .finally(function () {
        if (loadEmailsAbort === thisAbort) {
          loadEmailsAbort = null;
        }
      });
  }

  function copyAddress() {
    const v = els.generatedEmail.value.trim();
    if (!v) return;
    const btn = els.copyBtn;
    const label = btn.querySelector(".btn-label");

    function showCopiedSuccess() {
      if (copySuccessTimer) {
        clearTimeout(copySuccessTimer);
        copySuccessTimer = null;
      }
      if (label) label.textContent = "Copied!";
      btn.classList.remove("is-copy-pulse");
      void btn.offsetWidth;
      btn.classList.add("is-success", "is-copy-pulse");
      copySuccessTimer = window.setTimeout(function () {
        copySuccessTimer = null;
        btn.classList.remove("is-success", "is-copy-pulse");
        if (label) label.textContent = btn.dataset.defaultLabel || "📋";
      }, 2000);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(v)
        .then(function () {
          showCopiedSuccess();
        })
        .catch(function () {
          fallbackCopy(v);
          showCopiedSuccess();
        });
    } else {
      fallbackCopy(v);
      showCopiedSuccess();
    }
  }

  function fallbackCopy(text) {
    els.generatedEmail.select();
    try {
      document.execCommand("copy");
    } catch {
      /* ignore */
    }
  }

  initButtonDefaultLabels();

  els.copyBtn.addEventListener("click", copyAddress);

  els.generateEmail.addEventListener("click", function () {
    const btn = els.generateEmail;
    setButtonLoading(btn, true, "Generating...");
    const generatedEmail = generateRandomEmail();
    persistSession(generatedEmail);
    posthog.capture('email_generated', {
      email: generatedEmail
    });
    loadEmails()
      .catch(function () {})
      .finally(function () {
        setButtonLoading(btn, false);
        connectInboxSse();
      });
  });

  els.refreshInbox.addEventListener("click", function () {
    const btn = els.refreshInbox;
    setButtonLoading(btn, true, "Refreshing...");
    loadEmails()
      .catch(function () {})
      .finally(function () {
        setButtonLoading(btn, false);
        connectInboxSse();
      });
  });

  els.deleteEmail.addEventListener("click", function () {
    const btn = els.deleteEmail;
    const currentEmail = els.generatedEmail.value.trim();

    if (loadEmailsAbort) {
      loadEmailsAbort.abort();
      loadEmailsAbort = null;
    }
    loadEmailsSeq += 1;
    stopInboxStream();

    if (!currentEmail) {
      setButtonLoading(btn, true, "Deleting...");
      clearSession();
      loadEmails()
        .catch(function () {})
        .finally(function () {
          setButtonLoading(btn, false);
        });
      return;
    }

    if (!isAllowedInboxEmail(currentEmail)) {
      els.emails.className = "";
      els.emails.textContent = "Invalid email address";
      return;
    }

    if (
      !window.confirm("Are you sure you want to delete this email?")
    ) {
      return;
    }

    setButtonLoading(btn, true, "Deleting...");

    fetch(deleteUrlForEmail(currentEmail), {
      method: "POST",
      cache: "no-store",
    })
      .then(async function (res) {
        let body = {};
        try {
          body = JSON.parse(await res.text());
        } catch {
          /* ignore */
        }
        if (!res.ok) {
          throw new Error(
            (body && body.error) || "Request failed (" + res.status + ")"
          );
        }
        if (body.success !== true) {
          throw new Error((body && body.error) || "Delete failed");
        }
      })
      .then(function () {
        clearSession();
        return loadEmails().catch(function () {});
      })
      .then(function () {
        els.emails.className = "inbox-hint";
        els.emails.textContent = "Email deleted. Generate a new one";
      })
      .catch(function (err) {
        if (err.name === "AbortError") return;
        console.error("Delete failed:", err);
        els.emails.className = "";
        els.emails.textContent =
          "Could not delete this address. Please try again.";
      })
      .finally(function () {
        setButtonLoading(btn, false);
      });
  });

  syncSessionFromStorage();
  loadEmails()
    .catch(function () {})
    .finally(function () {
      connectInboxSse();
    });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      loadEmails({ silent: true })
        .catch(function () {})
        .finally(function () {
          connectInboxSse();
        });
    } else {
      stopInboxStream();
    }
  });
});
