import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import type { ProgressMessage } from "../types";

export default function ProgressTracker({ messages }: { messages: ProgressMessage[] }) {
  return (
    <section className="rounded-md border border-line bg-panel p-5">
      <h2 className="text-lg font-semibold text-white">Progress</h2>
      <ol className="mt-4 space-y-3">
        {messages.length === 0 ? (
          <li className="flex items-center gap-3 text-sm text-slate-400">
            <CircleDashed size={18} />
            Waiting to start
          </li>
        ) : (
          messages.map((item, index) => {
            const isLast = index === messages.length - 1;
            const Icon =
              item.status === "error" ? XCircle : item.status === "complete" ? CheckCircle2 : Loader2;
            return (
              <li
                key={`${item.timestamp}-${item.message}`}
                className="flex items-center gap-3 rounded-md border border-white/5 bg-ink/60 px-3 py-2 text-sm text-slate-200"
              >
                <Icon
                  size={18}
                  className={
                    item.status === "error"
                      ? "text-danger"
                      : item.status === "complete"
                        ? "text-good"
                        : isLast
                          ? "animate-spin text-cyanline"
                          : "text-slate-500"
                  }
                />
                <span>{item.message}</span>
              </li>
            );
          })
        )}
      </ol>
    </section>
  );
}