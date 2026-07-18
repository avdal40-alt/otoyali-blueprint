"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/States";
import { useI18n } from "@/i18n/client";
import type { AiContext, AiIntentId } from "../domain/types";
import { useAssistant } from "../hooks/useAssistant";
import { AssistantDisclaimer } from "./AssistantDisclaimer";
import { AssistantMessage } from "./AssistantMessage";
import { AssistantSuggestions } from "./AssistantSuggestions";
import { readAiCopy } from "./copy";

export function AssistantPanel({
  open,
  context,
  onClose
}: {
  open: boolean;
  context: AiContext;
  onClose: () => void;
}) {
  const { dictionary } = useI18n();
  const [input, setInput] = useState("");
  const { messages, isLoading, error, sendMessage, clear } = useAssistant(context);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => document.getElementById("rif-assistant-input")?.focus(), 80);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;
    setInput("");
    await sendMessage(message);
  }

  async function sendSuggestion(text: string, intent: AiIntentId) {
    setInput("");
    await sendMessage(text, intent);
  }

  return (
    <div className="fixed inset-0 z-modal bg-oto-text/40 md:bg-transparent" role="presentation">
      <button type="button" aria-label={readAiCopy(dictionary, "close", "Close")} className="absolute inset-0 cursor-default md:hidden" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="rif-assistant-title"
        className="safe-bottom fixed inset-x-3 bottom-20 flex max-h-[78vh] flex-col overflow-hidden rounded-modal border border-oto-border bg-white shadow-modal md:bottom-6 md:left-auto md:right-6 md:w-[420px]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-oto-border px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-oto-blue text-sm font-black text-white">R</span>
              <div>
                <h2 id="rif-assistant-title" className="text-base font-black text-oto-text">
                  {readAiCopy(dictionary, "title", "Rif")}
                </h2>
                <p className="text-xs font-semibold text-oto-muted">{readAiCopy(dictionary, "subtitle", "Local preview assistant")}</p>
              </div>
            </div>
            <Badge variant="ai" className="mt-2">
              {readAiCopy(dictionary, "status.localPreview", "Local preview")}
            </Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-oto-muted transition hover:bg-oto-surface hover:text-oto-text"
            aria-label={readAiCopy(dictionary, "close", "Close")}
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto bg-oto-surface/60 px-4 py-4">
          {messages.length === 0 ? (
            <div className="rounded-oto border border-oto-border bg-white p-4 shadow-soft">
              <p className="text-sm font-semibold leading-6 text-oto-text">{readAiCopy(dictionary, "introMessage", "Rif is in local preview and can provide general guidance only.")}</p>
              <div className="mt-4">
                <AssistantSuggestions surface={context.surface} disabled={isLoading} onSelect={sendSuggestion} />
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {messages.map((message) => (
                <AssistantMessage key={message.id} message={message} />
              ))}
            </div>
          )}
          {isLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-oto-muted" aria-live="polite">
              <Spinner className="h-4 w-4" />
              {readAiCopy(dictionary, "loading", "Rif is preparing a response...")}
            </div>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-md border border-oto-danger/15 bg-oto-danger/10 p-3 text-sm font-bold text-oto-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-oto-border bg-white p-4">
          <AssistantDisclaimer />
          <form onSubmit={submit} className="mt-3 grid gap-2">
            <Textarea
              id="rif-assistant-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={2}
              maxLength={700}
              placeholder={readAiCopy(dictionary, "placeholder", "Ask Rif...")}
              aria-label={readAiCopy(dictionary, "inputLabel", "Message to Rif")}
              className="min-h-[68px] resize-none"
            />
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={clear} className="text-xs font-black text-oto-muted transition hover:text-oto-blue">
                {readAiCopy(dictionary, "clear", "Clear")}
              </button>
              <Button type="submit" disabled={isLoading || !input.trim()} size="sm" rightIcon={<Icon name="chevronRight" />}>
                {readAiCopy(dictionary, "send", "Send")}
              </Button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  );
}
