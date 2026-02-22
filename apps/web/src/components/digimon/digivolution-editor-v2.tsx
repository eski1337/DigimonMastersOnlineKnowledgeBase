'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusIcon, XIcon, SaveIcon, Edit2Icon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface DigimonSearchResult {
  id: string;
  name: string;
  slug?: string;
}

interface DigivolutionEntry {
  id: string;
  name: string;
  requiredLevel?: number;
  requiredItem?: string;
}

interface DigivolutionEditorV2Props {
  digimonId: string;
  digimonName: string;
  currentDigivolutions?: {
    digivolvesFrom?: Array<{ id: string; name: string; requiredLevel?: number; requiredItem?: string }>;
    digivolvesTo?: Array<{ id: string; name: string; requiredLevel?: number; requiredItem?: string }>;
  };
  userRole?: string;
}

export function DigivolutionEditorV2({ 
  digimonId, 
  digimonName, 
  currentDigivolutions,
  userRole 
}: DigivolutionEditorV2Props) {
  // Only show to Owner, Admin, Editor
  const canEdit = userRole && ['owner', 'admin', 'editor'].includes(userRole.toLowerCase());
  
  if (!canEdit) {
    return null;
  }

  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DigimonSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [_editingIndex, _setEditingIndex] = useState<{ list: 'from' | 'to'; index: number } | null>(null);
  const { toast } = useToast();

  const [digivolvesFrom, setDigivolvesFrom] = useState<DigivolutionEntry[]>(
    currentDigivolutions?.digivolvesFrom || []
  );
  const [digivolvesTo, setDigivolvesTo] = useState<DigivolutionEntry[]>(
    currentDigivolutions?.digivolvesTo || []
  );

  const searchDigimon = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/digimon?where[name][contains]=${query}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.docs.filter((d: DigimonSearchResult) => d.id !== digimonId));
      }
    } catch (error: unknown) {
      console.error('Search failed:', error);
      toast({
        title: 'Search Error',
        description: 'Failed to search Digimon. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const addToList = (
    list: DigivolutionEntry[], 
    setList: (list: DigivolutionEntry[]) => void, 
    digimon: DigimonSearchResult
  ) => {
    if (!list.find(d => d.id === digimon.id)) {
      setList([...list, { id: digimon.id, name: digimon.name, requiredLevel: undefined, requiredItem: undefined }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeFromList = (
    list: DigivolutionEntry[], 
    setList: (list: DigivolutionEntry[]) => void, 
    id: string
  ) => {
    setList(list.filter(d => d.id !== id));
  };

  const updateEntry = (
    list: DigivolutionEntry[],
    setList: (list: DigivolutionEntry[]) => void,
    index: number,
    field: 'requiredLevel' | 'requiredItem',
    value: number | string | undefined
  ) => {
    const newList = [...list];
    if (field === 'requiredLevel') {
      newList[index].requiredLevel = value as number | undefined;
    } else {
      newList[index].requiredItem = value as string | undefined;
    }
    setList(newList);
  };

  const saveDigivolutions = async () => {
    try {
      const response = await fetch(`/api/digimon/${digimonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digivolutions: {
            digivolvesFrom: digivolvesFrom.map(d => ({
              id: d.id,
              requiredLevel: d.requiredLevel,
              requiredItem: d.requiredItem
            })),
            digivolvesTo: digivolvesTo.map(d => ({
              id: d.id,
              requiredLevel: d.requiredLevel,
              requiredItem: d.requiredItem
            })),
          }
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success!',
          description: 'Digivolution paths saved successfully!',
          variant: 'default',
        });
        setIsEditing(false);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const errorData = await response.json();
        toast({
          title: 'Save Failed',
          description: errorData.message || 'Failed to save digivolutions.',
          variant: 'destructive',
        });
      }
    } catch (error: unknown) {
      console.error('Save failed:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save digivolutions',
        variant: 'destructive',
      });
    }
  };

  if (!isEditing) {
    return (
      <Card className="bg-gradient-to-br from-[#1d2021] to-[#282828] border-orange-500/30">
        <CardContent className="pt-6">
          <Button 
            onClick={() => setIsEditing(true)}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
          >
            <Edit2Icon className="w-4 h-4 mr-2" />
            Edit Digivolution Paths
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1d2021] to-[#282828] border-orange-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl text-orange-400">
            Edit Digivolution Paths for {digimonName}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsEditing(false)}
            className="text-gray-400 hover:text-white"
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Bar */}
        <div className="space-y-2">
          <Label className="text-orange-300">Search & Add Digimon</Label>
          <Input
            type="text"
            placeholder="Type Digimon name to search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              searchDigimon(e.target.value);
            }}
            className="bg-[#1a1a1a] border-orange-500/30 focus:ring-orange-500/50 text-white"
          />
          {isSearching && <p className="text-sm text-yellow-400">Searching...</p>}
          {searchResults.length > 0 && (
            <div className="bg-[#1a1a1a] border border-orange-500/30 rounded-lg p-2 space-y-1 max-h-64 overflow-y-auto">
              {searchResults.map((digimon) => (
                <div key={digimon.id} className="p-3 hover:bg-orange-500/10 rounded-lg border border-orange-500/10">
                  <div className="font-semibold text-white mb-2">{digimon.name}</div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-blue-500/50 text-blue-300 hover:bg-blue-500/20"
                      onClick={() => addToList(digivolvesFrom, setDigivolvesFrom, digimon)}
                    >
                      <PlusIcon className="w-3 h-3 mr-1" /> Evolves From
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-green-500/50 text-green-300 hover:bg-green-500/20"
                      onClick={() => addToList(digivolvesTo, setDigivolvesTo, digimon)}
                    >
                      <PlusIcon className="w-3 h-3 mr-1" /> Evolves To
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Digivolves From */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
            <span>⬆️</span> Digivolves From (Previous Forms)
          </h3>
          <div className="space-y-2">
            {digivolvesFrom.map((entry, index) => (
              <div key={entry.id} className="bg-blue-500/5 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">{entry.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFromList(digivolvesFrom, setDigivolvesFrom, entry.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-400">Required Level</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 11"
                      value={entry.requiredLevel || ''}
                      onChange={(e) => updateEntry(
                        digivolvesFrom, 
                        setDigivolvesFrom, 
                        index, 
                        'requiredLevel', 
                        e.target.value ? parseInt(e.target.value) : undefined
                      )}
                      className="bg-[#1a1a1a] border-blue-500/30 text-white text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Required Item</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Data Chip"
                      value={entry.requiredItem || ''}
                      onChange={(e) => updateEntry(
                        digivolvesFrom, 
                        setDigivolvesFrom, 
                        index, 
                        'requiredItem', 
                        e.target.value || undefined
                      )}
                      className="bg-[#1a1a1a] border-blue-500/30 text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
            {digivolvesFrom.length === 0 && (
              <p className="text-sm text-gray-400 italic">No previous forms added yet</p>
            )}
          </div>
        </div>

        {/* Digivolves To */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
            <span>⬇️</span> Digivolves To (Next Forms)
          </h3>
          <div className="space-y-2">
            {digivolvesTo.map((entry, index) => (
              <div key={entry.id} className="bg-green-500/5 border border-green-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">{entry.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFromList(digivolvesTo, setDigivolvesTo, entry.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-400">Required Level</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 11"
                      value={entry.requiredLevel || ''}
                      onChange={(e) => updateEntry(
                        digivolvesTo, 
                        setDigivolvesTo, 
                        index, 
                        'requiredLevel', 
                        e.target.value ? parseInt(e.target.value) : undefined
                      )}
                      className="bg-[#1a1a1a] border-green-500/30 text-white text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Required Item</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Digi-Egg"
                      value={entry.requiredItem || ''}
                      onChange={(e) => updateEntry(
                        digivolvesTo, 
                        setDigivolvesTo, 
                        index, 
                        'requiredItem', 
                        e.target.value || undefined
                      )}
                      className="bg-[#1a1a1a] border-green-500/30 text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
            {digivolvesTo.length === 0 && (
              <p className="text-sm text-gray-400 italic">No next forms added yet</p>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-orange-500/30">
          <Button 
            onClick={saveDigivolutions}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold py-6"
          >
            <SaveIcon className="w-5 h-5 mr-2" />
            Save All Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
