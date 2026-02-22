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

  return (
    <Card className="mt-8 bg-gradient-to-br from-[#1d2021] to-[#282828]">
      <CardHeader>
        <CardTitle className="text-2xl">Skills & Abilities</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {skills.map((skill, index) => {
          const skillIconUrl = typeof skill.icon === 'string' 
            ? skill.icon 
            : skill.icon?.url;
          
          // Parse damage per level
          const damageArray = skill.damagePerLevel 
            ? skill.damagePerLevel.split(',').map(d => d.trim()).filter(d => d)
            : [];
          
          const currentLevel = selectedLevels[index] || 0;
          
          return (
            <Card key={index} className="bg-gradient-to-br from-[#252525] to-[#1a1a1a] border-blue-500/30">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  {skillIconUrl && (
                    <div className="flex-shrink-0">
                      <div className="relative w-24 h-24 bg-black/30 rounded-lg p-2 border-2 border-blue-500/30">
                        <Image 
                          src={skillIconUrl} 
                          alt={skill.name}
                          fill
                          sizes="(max-width: 768px) 40px, 48px"
                          className="object-contain"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="text-xl font-bold text-blue-400">{skill.name}</h3>
                      {skill.type && (
                        <Badge variant="outline" className="ml-2 border-blue-500/50">{skill.type}</Badge>
                      )}
                    </div>
                    
                    {skill.element && (
                      <div className="flex items-center gap-2">
                        <Image 
                          src={getElementIconPath(skill.element)} 
                          alt={skill.element}
                          width={40}
                          height={40}
                        />
                        <span className="text-sm text-muted-foreground">{skill.element}</span>
                      </div>
                    )}
                    
                    {skill.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{skill.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                        <div className="text-xs text-yellow-400/70">Cooldown</div>
                        <div className="text-lg font-bold text-yellow-400">{displayValue(skill.cooldown, 's')}</div>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                        <div className="text-xs text-blue-400/70">DS</div>
                        <div className="text-lg font-bold text-blue-400">{displayValue(skill.dsConsumption)}</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2">
                        <div className="text-xs text-purple-400/70">SP/Upgrade</div>
                        <div className="text-lg font-bold text-purple-400">{displayValue(skill.skillPointsPerUpgrade)}</div>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                        <div className="text-xs text-green-400/70">Animation</div>
                        <div className="text-lg font-bold text-green-400">{displayValue(skill.animationTime, 's')}</div>
                      </div>
                    </div>
                    
                    {damageArray.length > 0 && (
                      <div className="bg-muted/30 rounded-lg p-3 border border-muted">
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-semibold text-muted-foreground">Damage at Level:</label>
                          <select 
                            className="flex-1 max-w-xs px-3 py-2 bg-[#1a1a1a] border border-blue-500/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            value={currentLevel}
                            onChange={(e) => {
                              setSelectedLevels(prev => ({
                                ...prev,
                                [index]: parseInt(e.target.value)
                              }));
                            }}
                          >
                            {damageArray.map((dmg, idx) => (
                              <option key={idx} value={idx}>
                                Level {idx + 1}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs text-muted-foreground">Damage:</span>
                            <span className="text-2xl font-bold text-green-400">
                              {damageArray[currentLevel]}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
