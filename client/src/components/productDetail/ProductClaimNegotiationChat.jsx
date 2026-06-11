import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useUI } from "../../context/UIContext.jsx";
import {
  fetchClaimMessages,
  sendClaimMessage,
} from "../../api/claimMessages.js";
import { ApiError } from "../../api/client.js";
import { NEGOTIABLE_CLAIM_STATUSES } from "./claimUtils.js";
import MaterialIcon from "../ui/MaterialIcon.jsx";

/**
 * Slide-in negotiation chat for a claim/proposal (replaces counter-offer flow).
 */
export default function ProductClaimNegotiationChat({
  claim,
  open,
  onClose,
  onMessageSent,
  /** "slide" = overlay on claim card; "panel" = fixed side panel (e.g. modal) */
  variant = "slide",
  /** When false, Escape is left to the parent (e.g. claims table modal). */
  closeOnEscape = true,
}) {
  const { user } = useAuth();
  const { showToast } = useUI();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const wasOpenRef = useRef(false);
  const pendingOpenScrollRef = useRef(false);
  const prevMessageCountRef = useRef(0);
  const canSend = NEGOTIABLE_CLAIM_STATUSES.includes(claim?.status);

  const scrollMessagesToBottom = useCallback((behavior = "auto") => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const loadMessages = useCallback(
    async ({ silent = false } = {}) => {
      if (!claim?.id) return;
      if (!silent) setLoading(true);
      try {
        const rows = await fetchClaimMessages(claim.id);
        setMessages((prev) => {
          if (
            prev.length === rows.length &&
            prev.every((m, i) => m.id === rows[i]?.id)
          ) {
            return prev;
          }
          return rows;
        });
      } catch (err) {
        showToast(
          err instanceof ApiError ? err.message : "Could not load messages.",
          "error"
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [claim?.id, showToast]
  );

  useEffect(() => {
    if (!open || !claim?.id) {
      wasOpenRef.current = false;
      prevMessageCountRef.current = 0;
      return;
    }
    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (justOpened) {
      stickToBottomRef.current = true;
      pendingOpenScrollRef.current = true;
    }
    loadMessages();
    const interval = setInterval(() => loadMessages({ silent: true }), 8000);
    return () => clearInterval(interval);
  }, [open, claim?.id, loadMessages]);

  useEffect(() => {
    if (!open) return;

    const count = messages.length;
    const grew = count > prevMessageCountRef.current;
    prevMessageCountRef.current = count;

    const shouldScroll =
      count > 0 &&
      stickToBottomRef.current &&
      (pendingOpenScrollRef.current || grew);

    if (!shouldScroll) return;

    pendingOpenScrollRef.current = false;
    requestAnimationFrame(() => {
      scrollMessagesToBottom(grew && count > 1 ? "smooth" : "auto");
    });
  }, [open, messages.length, scrollMessagesToBottom]);

  function handleMessagesScroll() {
    const el = messagesRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 48;
  }

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, closeOnEscape]);

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || !canSend || !claim?.id) return;
    setSending(true);
    try {
      const msg = await sendClaimMessage(claim.id, text);
      if (msg) setMessages((prev) => [...prev, msg]);
      setDraft("");
      stickToBottomRef.current = true;
      requestAnimationFrame(() => scrollMessagesToBottom("smooth"));
      await onMessageSent?.();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Could not send message.",
        "error"
      );
    } finally {
      setSending(false);
    }
  }

  if (!claim || !open) return null;

  const isExchange = claim.type === "exchange_proposal";
  const isPanel = variant === "panel";

  const shellClass = isPanel
    ? "flex flex-1 min-h-0 w-full flex-col bg-surface-container-lowest"
    : `absolute inset-y-0 right-0 z-20 flex h-full w-[min(100%,30rem)] flex-col rounded-r-2xl bg-surface-container-lowest border-l border-outline-variant/25 shadow-xl transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "translate-x-full pointer-events-none"
      }`;

  return (
    <div className={shellClass} aria-hidden={!open}>
      <div className="flex h-full min-h-0 max-h-full flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-2 border-b border-outline-variant/20 px-4 py-3 shrink-0">
          <div>
            <p className="font-headline font-bold text-sm">Negotiate</p>
            <p className="text-xs text-zinc-500">
              {isExchange ? "Exchange proposal" : "Give claim"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 text-zinc-600"
            aria-label="Close negotiation"
          >
            <MaterialIcon name="close" />
          </button>
        </header>

        <div
          ref={messagesRef}
          onScroll={handleMessagesScroll}
          className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 py-3 space-y-2"
        >
          {loading && messages.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">Loading…</p>
          ) : null}
          {!loading && messages.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8 px-2">
              No messages yet. Say hello and discuss pickup or trade details.
            </p>
          ) : null}
          {messages.map((m, index) => {
            const mine = String(m.senderUserId) === String(user?.id);
            return (
              <div
                key={m.id ?? `msg-${index}`}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-zinc-200 text-zinc-900 rounded-bl-md"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })}
        </div>

        {canSend ? (
          <form
            onSubmit={handleSend}
            className="border-t border-outline-variant/20 p-3 flex gap-2 shrink-0"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              disabled={sending}
              className="flex-1 min-w-0 px-3 py-2.5 rounded-full border border-outline-variant/30 text-sm bg-white"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="px-4 py-2.5 rounded-full font-bold text-sm bg-primary text-white disabled:opacity-50 shrink-0"
              aria-label="Send message"
            >
              <MaterialIcon name="send" className="text-lg" />
            </button>
          </form>
        ) : (
          <p className="text-xs text-zinc-500 px-4 py-3 border-t border-outline-variant/20">
            Negotiation is closed for this {isExchange ? "proposal" : "claim"}.
          </p>
        )}
      </div>
    </div>
  );
}

