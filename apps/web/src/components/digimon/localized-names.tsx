'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface LocalizedNamesProps {
  names: {
    katakana?: string;
    japanese?: string;
    korean?: string;
    chinese?: string;
    thai?: string;
  };
}

export function LocalizedNames({ names }: LocalizedNamesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if there are any localized names to show
  const hasLocalizedNames = names.japanese || names.korean || names.chinese || names.thai;

  if (!hasLocalizedNames) {
    return null;
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors"
      >
        <span>Localized Names</span>
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isExpanded && (
        <div className="text-sm text-white/90 mt-2 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {(names.katakana || names.japanese) && (
            <div className="text-xs">
              ({names.katakana && <span>{names.katakana}</span>}
              {names.katakana && names.japanese && ' '}
              {names.japanese && <span className="italic">{names.japanese}</span>})
            </div>
          )}
          {names.korean && <div className="text-xs"><span className="opacity-70">Korean:</span> {names.korean}</div>}
          {names.chinese && <div className="text-xs"><span className="opacity-70">Chinese:</span> {names.chinese}</div>}
          {names.thai && <div className="text-xs"><span className="opacity-70">Thai:</span> {names.thai}</div>}
        </div>
      )}
    </div>
  );
}
