"use client";

import { useState } from "react";
import { Message, Citation, Claim } from "@/types/chat";

function deduplicateSources(claims: Claim[]): Citation[] {
  const unique = new Map<string, Citation>();
  for (const claim of claims) {
    if (claim.source && claim.source.document_name) {
      const key = `${claim.source.document_name}|${claim.source.section || ""}`;
      if (!unique.has(key)) {
        unique.set(key, claim.source);
      }
    }
  }
  return Array.from(unique.values());
}

export function MessageBubble({ message }: { message: Message }) {
  const [showClaims, setShowClaims] = useState(false);
  const isUser = message.role === "user";

  const validClaims = (!isUser && message.claims)
    ? message.claims.filter(
        (c) => c && c.claim_text && c.source && c.source.document_name && c.source.document_name.trim().length > 0
      )
    : [];

  const sources = deduplicateSources(validClaims);

  // Split content and disclaimer if present
  let mainContent = message.content;
  let disclaimerText: string | null = null;

  const disclaimerMatch = message.content.match(/(?:(?:\*+)?Disclaimer(?:\*+)?:?\s*)([\s\S]+)$/i);
  if (disclaimerMatch) {
    mainContent = message.content.substring(0, disclaimerMatch.index).trim();
    disclaimerText = disclaimerMatch[1].replace(/^\*+|\*+$/g, "").trim();
  }

  return (
    <div className={`flex flex-col transition-all duration-300 ${isUser ? "items-end" : "items-start"} mb-6`}>
      <div className="flex items-center space-x-2 mb-1 px-1">
        <span className="text-[11px] font-semibold tracking-wide uppercase text-zinc-500">
          {isUser ? "You" : "Nutrition Bot"}
        </span>
      </div>

      {isUser ? (
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm text-white shadow-lg shadow-blue-950/20 leading-relaxed break-words">
          {message.content}
        </div>
      ) : (
        <div className="max-w-[90%] sm:max-w-[85%] rounded-2xl rounded-tl-sm bg-zinc-900 border border-zinc-800/90 px-5 py-4 text-sm text-zinc-200 shadow-md leading-relaxed space-y-3">
          {/* Main Answer Content */}
          <p className="whitespace-pre-line text-zinc-100">{mainContent}</p>

          {/* Medical Disclaimer Box */}
          {disclaimerText && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-xs flex items-start space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <div className="leading-relaxed">
                <span className="font-semibold text-amber-300">Disclaimer: </span>
                <span>{disclaimerText}</span>
              </div>
            </div>
          )}

          {/* Sources explicitly mentioned below the response */}
          {sources.length > 0 && (
            <div className="pt-2.5 border-t border-zinc-800/80 flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-[11px] uppercase tracking-wider">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 17L12 22l10-5M2 12l10 5 10-5M12 2L2 7l10 5 10-5-10-5z"/></svg>
                  <span>Sources for this response ({sources.length})</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowClaims(!showClaims)}
                  className="text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <span>{validClaims.length} verified {validClaims.length === 1 ? "statement" : "statements"}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-emerald-500 font-medium">{showClaims ? "Hide statements" : "View statements"}</span>
                </button>
              </div>

              {/* Source List */}
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {sources.map((src, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col bg-zinc-950/80 border border-zinc-800/90 rounded-lg px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">{src.document_name}</span>
                      {src.year ? (
                        <span className="text-[10px] text-zinc-400 font-mono px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700/60">
                          {src.year}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-400 mt-0.5">
                      {src.publisher && <span>{src.publisher}</span>}
                      {src.section && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-400">Section: {src.section}</span>
                        </>
                      )}
                      {src.url && src.url !== "https://example.com/nutrition" && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline font-medium"
                          >
                            <span>View source document</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Expandable Verified Statements */}
              {showClaims && (
                <div className="mt-2 space-y-1.5 pt-2 border-t border-zinc-800/60">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Extracted Factual Statements
                  </span>
                  {validClaims.map((claim, idx) => (
                    <div
                      key={idx}
                      className="bg-zinc-950/60 border border-emerald-500/20 rounded-lg p-2.5 text-xs space-y-1"
                    >
                      <p className="text-zinc-200 leading-normal">"{claim.claim_text}"</p>
                      {claim.source && (
                        <p className="text-[10px] text-emerald-400/90 font-medium">
                          Grounded in: {claim.source.document_name}
                          {claim.source.section ? ` · ${claim.source.section}` : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
