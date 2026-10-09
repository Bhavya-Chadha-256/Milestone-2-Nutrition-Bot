import { Claim, Citation } from "@/types/chat";
import { SourceCard } from "./SourceCard";

function deduplicateSources(claims: Claim[]): Citation[] {
  const unique = new Map<string, Citation>();
  for (const claim of claims) {
    if (claim.source) {
      const key = `${claim.source.document_name}|${claim.source.section}`;
      if (!unique.has(key)) {
        unique.set(key, claim.source);
      }
    }
  }
  return Array.from(unique.values());
}

export function SourcesPanel({ claims }: { claims: Claim[] }) {
  const uniqueSources = deduplicateSources(claims || []);

  return (
    <div className="flex flex-col h-full bg-zinc-925/90 text-zinc-100 flex-shrink-0 border-l border-zinc-800">
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-zinc-800 text-emerald-400 border border-zinc-700/60">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 17L12 22l10-5M2 12l10 5 10-5M12 2L2 7l10 5 10-5-10-5z"/></svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Sources</h2>
            <p className="text-[11px] text-zinc-400">Dietary guidance citations</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            {uniqueSources.length} Sources
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {(!claims || claims.length === 0 || uniqueSources.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <div className="w-12 h-12 rounded-full bg-zinc-850 flex items-center justify-center mb-3 text-zinc-400 border border-zinc-800">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><path d="m14 17-2.83-2.83"/></svg>
            </div>
            <p className="text-sm font-medium text-zinc-300 mb-1">No sources for this response</p>
            <p className="text-xs text-zinc-500 max-w-[220px]">
              The guidance might not cover this topic or no query was made.
            </p>
          </div>
        ) : (
          uniqueSources.map((source, idx) => (
            <SourceCard key={`${source.document_name}-${source.section}-${idx}`} source={source} />
          ))
        )}
      </div>
    </div>
  );
}
