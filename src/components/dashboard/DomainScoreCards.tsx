'use client';

import React from 'react';

interface DomainScoreCardsProps {
  scores: Record<string, number>;
  findingCounts?: Record<string, number>;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-lime';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 70) return 'bg-lime/10';
  if (score >= 40) return 'bg-yellow-400/10';
  return 'bg-red-400/10';
}

export function DomainScoreCards({ scores, findingCounts }: DomainScoreCardsProps) {
  const modules = Object.keys(scores);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {modules.map((module) => {
        const score = scores[module];
        const count = findingCounts?.[module];

        return (
          <div
            key={module}
            className="bg-dark-gray rounded-xl p-4 flex flex-col items-center gap-2"
          >
            <span className="text-xs font-mono uppercase tracking-wider text-medium-gray">
              {module}
            </span>
            <div
              className={`flex items-center justify-center w-14 h-14 rounded-full ${getScoreBg(score)}`}
            >
              <span className={`font-heading text-2xl font-bold ${getScoreColor(score)}`}>
                {score}
              </span>
            </div>
            {count !== undefined && (
              <span className="text-xs text-medium-gray">
                {count} finding{count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
