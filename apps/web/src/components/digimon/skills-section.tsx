'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Skill {
  name: string;
  icon?: string | { url: string };
  type?: string;
  element?: string;
  description?: string;
  cooldown?: number | null;
  dsConsumption?: number | null;
  skillPointsPerUpgrade?: number | null;
  animationTime?: number | null;
  damagePerLevel?: string;
}

interface SkillsSectionProps {
  skills: Skill[];
}

export function SkillsSection({ skills }: SkillsSectionProps) {
  const [selectedLevels, setSelectedLevels] = useState<Record<number, number>>({});

  // Icon path helper - duplicated here since we can't pass functions to Client Components
  const getElementIconPath = (element: string) => {
    const normalizedElement = element?.replace(/\s+/g, '_');
    return `/icons/Elements/${normalizedElement}.png`;
  };

  // Helper to display value or "?" if missing
  const displayValue = (value: number | null | undefined, suffix: string = ''): string => {
    if (value === null || value === undefined) {
      return '?';
    }
    return `${value}${suffix}`;
  };

  const keybindLabel = (idx: number) => `F${idx + 1}`;

  return (
    <Card className="mt-8 bg-card">
      <CardHeader>
        <CardTitle className="text-2xl">Skills & Abilities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {skills.map((skill, index) => {
            const skillIconUrl = typeof skill.icon === 'string' 
              ? skill.icon 
              : skill.icon?.url;
            
            // Parse damage per level (stored as JSON string: [{"level":1,"damage":1234},...])
            let damageEntries: { level: number; damage: number }[] = [];
            if (skill.damagePerLevel) {
              try {
                const parsed = JSON.parse(skill.damagePerLevel);
                if (Array.isArray(parsed)) {
                  damageEntries = parsed.map((entry: any) => ({
                    level: entry.level || 0,
                    damage: entry.damage || 0,
                  }));
                }
              } catch {
                // Fallback: try comma-separated plain numbers
                const parts = skill.damagePerLevel.split(',').map(d => d.trim()).filter(d => d);
                damageEntries = parts.map((d, i) => ({ level: i + 1, damage: parseInt(d) || 0 }));
              }
            }
            
            const currentLevel = selectedLevels[index] || 0;
            
            return (
              <Card key={index} className="bg-card border-blue-500/30">
                <CardContent className="pt-5 pb-4 px-4">
                  <div className="flex gap-3">
                    {skillIconUrl && (
                      <div className="flex-shrink-0">
                        <div className="relative w-16 h-16 bg-black/30 rounded-lg p-1.5 border-2 border-blue-500/30">
                          <Image 
                            src={skillIconUrl} 
                            alt={skill.name}
                            fill
                            sizes="64px"
                            className="object-contain"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-bold text-blue-400 leading-tight min-w-0 break-words">{skill.name}</h3>
                        <Badge className="shrink-0 bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold text-xs px-2 py-0.5">
                          {keybindLabel(index)}
                        </Badge>
                      </div>
                      
                      {skill.element && (
                        <div className="flex items-center gap-1.5">
                          <Image 
                            src={getElementIconPath(skill.element)} 
                            alt={skill.element}
                            width={24}
                            height={24}
                          />
                          <span className="text-xs text-muted-foreground">{skill.element}</span>
                        </div>
                      )}
                      
                      {skill.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{skill.description}</p>
                      )}
                    </div>
                  </div>
                  
                  {(skill.cooldown != null || skill.dsConsumption != null || skill.skillPointsPerUpgrade != null || skill.animationTime != null) && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-1.5">
                        <div className="text-[10px] text-yellow-400/70">Cooldown</div>
                        <div className="text-base font-bold text-yellow-400">{displayValue(skill.cooldown, 's')}</div>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-1.5">
                        <div className="text-[10px] text-blue-400/70">DS</div>
                        <div className="text-base font-bold text-blue-400">{displayValue(skill.dsConsumption)}</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-1.5">
                        <div className="text-[10px] text-purple-400/70">SP/Upgrade</div>
                        <div className="text-base font-bold text-purple-400">{displayValue(skill.skillPointsPerUpgrade)}</div>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-1.5">
                        <div className="text-[10px] text-green-400/70">Animation</div>
                        <div className="text-base font-bold text-green-400">{displayValue(skill.animationTime, 's')}</div>
                      </div>
                    </div>
                  )}
                  
                  {damageEntries.length > 0 && (
                    <div className="bg-muted/30 rounded-lg p-2 border border-muted mt-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Damage at Level:</label>
                        <select 
                          className="flex-1 min-w-[100px] max-w-[160px] px-2 py-1 bg-background border border-blue-500/30 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          value={currentLevel}
                          onChange={(e) => {
                            setSelectedLevels(prev => ({
                              ...prev,
                              [index]: parseInt(e.target.value)
                            }));
                          }}
                        >
                          {damageEntries.map((entry, idx) => (
                            <option key={idx} value={idx}>
                              Level {entry.level}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-baseline gap-1 ml-auto">
                          <span className="text-[10px] text-muted-foreground">Damage:</span>
                          <span className="text-xl font-bold text-green-400">
                            {damageEntries[currentLevel]?.damage?.toLocaleString() ?? '?'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
