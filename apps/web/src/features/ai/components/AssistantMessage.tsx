"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/client";
import type { AssistantChatMessage } from "../hooks/useAssistant";
import { readAiCopy } from "./copy";

export function AssistantMessage({ message }: { message: AssistantChatMessage }) {
  const { dictionary } = useI18n();
  const isUser = message.role === "user";

  return (
    <article className={cn("grid gap-2", isUser ? "justify-items-end" : "justify-items-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-oto px-3 py-2 text-sm leading-6",
          isUser ? "bg-oto-blue text-white" : "border border-oto-border bg-white text-oto-text shadow-soft"
        )}
      >
        <p className="whitespace-pre-line">{message.content}</p>
      </div>
      {!isUser && message.structuredData?.length ? (
        <div className="w-full max-w-[88%] rounded-oto border border-oto-border bg-white p-3 text-sm shadow-soft">
          {message.structuredData.map((item) => {
            if (item.type === "assistant_intro") {
              return (
                <div key={item.type} className="flex flex-wrap gap-2">
                  {item.capabilities.map((capability) => (
                    <Badge key={capability} variant="ai">
                      {readAiCopy(dictionary, `capabilities.${capability}.label`, capability)}
                    </Badge>
                  ))}
                </div>
              );
            }

            if (item.type === "search_guidance") {
              return (
                <ul key={item.type} className="grid gap-1 font-semibold text-oto-muted">
                  {item.filters.map((filter) => (
                    <li key={filter}>• {filter}</li>
                  ))}
                </ul>
              );
            }

            return (
              <ul key={item.type} className="grid gap-2">
                {item.items.map((checklistItem) => (
                  <li key={checklistItem.id} className="flex items-start gap-2 text-sm font-semibold text-oto-muted">
                    <span className="mt-1 h-2 w-2 rounded-full bg-oto-blue" aria-hidden="true" />
                    <span>{checklistItem.label}</span>
                  </li>
                ))}
              </ul>
            );
          })}
        </div>
      ) : null}
      {!isUser && message.actions?.length ? (
        <div className="flex w-full max-w-[88%] flex-wrap gap-2">
          {message.actions.map((action) => (
            <Link
              key={`${action.type}-${action.href}`}
              href={action.href}
              className="rounded-md border border-oto-blue/20 bg-oto-blue/10 px-3 py-2 text-xs font-black text-oto-blue transition hover:bg-oto-blue/15"
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
      {!isUser && message.warnings?.includes("feature_not_connected") ? (
        <p className="max-w-[88%] text-xs font-semibold leading-5 text-oto-muted">
          {readAiCopy(dictionary, "featureNotConnected", "Advanced AI features are not connected yet.")}
        </p>
      ) : null}
    </article>
  );
}
