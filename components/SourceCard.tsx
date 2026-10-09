import { Citation } from "@/types/chat";

export function SourceCard({ source }: { source: Citation }) {
  return (
    <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 transition-all shadow-sm space-y-2.5 group">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-emerald-400 leading-tight">
          📄 {source.document_name}
        </h3>
      </div>
      
      <div className="space-y-1.5 text-xs text-zinc-300">
        <div className="flex items-start gap-2">
          <span className="text-zinc-500 w-16 flex-shrink-0">Publisher:</span>
          <span className="font-medium text-zinc-200">{source.publisher}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-zinc-500 w-16 flex-shrink-0">Year:</span>
          <span className="font-medium text-zinc-200">{source.year}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-zinc-500 w-16 flex-shrink-0">Section:</span>
          <span className="font-medium text-zinc-200">{source.section}</span>
        </div>
      </div>
      
      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
        <a 
          href={source.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          View source document
        </a>
      </div>
    </div>
  );
}
