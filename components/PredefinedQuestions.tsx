"use client";

import React from "react";

interface PredefinedQuestionsProps {
  onSelect: (question: string) => void;
  onClose: () => void;
}

const PREDEFINED_QUESTIONS = [
  {
    category: "Nutrient requirements",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
    ),
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    question: "How much protein does an adult need per day?",
  },
  {
    category: "Food safety and storage",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    ),
    badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    question: "How long can cooked chicken stay in the fridge?",
  },
  {
    category: "Cooking methods",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c2-2.96 0-7-1-8 0 3.03-2 4-2 6s2 3 3 2Z"/><path d="M7 16c2.5-3.5 0-8.5-1-9.5 0 3.7-2.5 5-2.5 7.5 0 2.5 2 3.5 3.5 2Z"/><path d="M17 14c2.5-3.5 0-8.5-1-9.5 0 3.7-2.5 5-2.5 7.5 0 2.5 2 3.5 3.5 2Z"/></svg>
    ),
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    question: "What internal temperature should poultry be cooked to?",
  },
];

export function PredefinedQuestions({ onSelect, onClose }: PredefinedQuestionsProps) {
  return (
    <div className="mx-4 md:mx-6 mb-2 p-3 bg-zinc-900/95 border border-zinc-800/90 rounded-xl shadow-lg backdrop-blur-sm relative transition-all animate-fade-in">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/60">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] font-semibold tracking-wide uppercase text-zinc-400">
            Suggested Questions
          </span>
        </div>

        <button
          onClick={onClose}
          title="Dismiss suggestions"
          className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 p-1 rounded-md transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {PREDEFINED_QUESTIONS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(item.question)}
            className="flex flex-col text-left p-2.5 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/70 border border-zinc-800/80 hover:border-zinc-700 transition-all group cursor-pointer"
          >
            <div className="flex items-center space-x-1.5 mb-1">
              <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${item.badgeColor}`}>
                {item.icon}
                <span>{item.category}</span>
              </span>
            </div>
            <p className="text-xs text-zinc-300 group-hover:text-zinc-100 font-medium line-clamp-2 leading-snug">
              {item.question}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
