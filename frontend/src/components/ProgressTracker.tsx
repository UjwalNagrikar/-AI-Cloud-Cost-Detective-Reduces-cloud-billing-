import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import type { ProgressMessage } from "../types";

export default function ProgressTracker({ messages }: { messages: ProgressMessage[] }) {
  return (
    <section
      className="rounded-2xl p-5 h-full"
      style={{
        background: "rgba(13, 31, 54, 0.5)",
        border: "1px solid rgba(26, 53, 87, 0.9)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div
          className="h-2 w-2 rounded-full"
          style={{
            background:
              messages.length === 0
                ? "#1a3557"
                : messages[messages.length - 1]?.status === "complete"
                ? "#22c55e"
                : messages[messages.length - 1]?.status === "error"
                ? "#ef4444"
                : "#00d4ff",
            boxShadow:
              messages.length > 0 &&
              messages[messages.length - 1]?.status === "running"
                ? "0 0 8px rgba(0,212,255,0.7)"
                : undefined,
          }}
        />
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
          Scan Progress
        </h2>
        {messages.length > 0 && (
          <span className="ml-auto text-xs text-slate-600 font-mono">
            {messages.length} step{messages.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Timeline */}
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <CircleDashed size={28} className="text-slate-700" />
          <p className="text-sm text-slate-600">
            Select a resource group and run the analysis to see live progress here.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-0">
          {messages.map((item, index) => {
            const isLast   = index === messages.length - 1;
            const isActive = isLast && item.status === "running";
            const isDone   = item.status === "complete";
            const isError  = item.status === "error";

            return (
              <li
                key={`${item.timestamp}-${index}`}
                className="relative flex gap-3 animate-slide-in pb-4"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {/* Connecting line */}
                {index < messages.length - 1 && (
                  <div
                    className="absolute left-[10px] top-5 w-px"
                    style={{
                      bottom: "-2px",
                      background: isDone
                        ? "rgba(34,197,94,0.25)"
                        : "rgba(26,53,87,0.8)",
                    }}
                  />
                )}

                {/* Dot */}
                <div className="relative flex-shrink-0 mt-0.5">
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-full animate-ping-dot"
                      style={{ background: "rgba(0,212,255,0.3)" }}
                    />
                  )}
                  <div
                    className="relative h-5 w-5 rounded-full flex items-center justify-center"
                    style={{
                      background: isError
                        ? "rgba(239,68,68,0.15)"
                        : isDone
                        ? "rgba(34,197,94,0.15)"
                        : isActive
                        ? "rgba(0,212,255,0.15)"
                        : "rgba(26,53,87,0.8)",
                      border: `1px solid ${
                        isError
                          ? "rgba(239,68,68,0.4)"
                          : isDone
                          ? "rgba(34,197,94,0.4)"
                          : isActive
                          ? "rgba(0,212,255,0.5)"
                          : "rgba(26,53,87,0.8)"
                      }`,
                    }}
                  >
                    {isError ? (
                      <XCircle size={11} className="text-danger" />
                    ) : isDone ? (
                      <CheckCircle2 size={11} className="text-good" />
                    ) : isActive ? (
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ background: "#00d4ff" }}
                      />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-frame" />
                    )}
                  </div>
                </div>

                {/* Message */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p
                    className="text-sm leading-snug"
                    style={{
                      color: isError
                        ? "#fca5a5"
                        : isDone
                        ? "#86efac"
                        : isActive
                        ? "#f1f5f9"
                        : "#64748b",
                    }}
                  >
                    {item.message}
                  </p>
                  <p className="text-[10px] text-slate-700 font-mono mt-0.5">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}