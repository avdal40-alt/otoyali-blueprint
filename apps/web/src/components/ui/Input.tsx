import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-oto-border bg-white px-3 text-sm text-oto-text outline-none transition placeholder:text-oto-muted focus:border-oto-blue focus:ring-2 focus:ring-blue-100",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-md border border-oto-border bg-white px-3 py-3 text-sm text-oto-text outline-none transition placeholder:text-oto-muted focus:border-oto-blue focus:ring-2 focus:ring-blue-100",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-md border border-oto-border bg-white px-3 text-sm text-oto-text outline-none transition focus:border-oto-blue focus:ring-2 focus:ring-blue-100",
        className
      )}
      {...props}
    />
  );
}
