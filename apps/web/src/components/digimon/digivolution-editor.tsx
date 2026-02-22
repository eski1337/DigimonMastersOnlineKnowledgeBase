'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, XIcon, SaveIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface DigimonSearchResult {
  id: string;
  name: string;
  slug?: string;
}

interface DigimonReference {
  id: string;
  name: string;
}

interface DigivolutionEditorProps {
  digimonId: string;
  digimonName: string;
  currentDigivolutions?: {
    digivolvesFrom?: Array<{ id: string; name: string }>;
    digivolvesTo?: Array<{ id: string; name: string }>;
    jogress?: Array<{ id: string; name: string }>;
  };
  userRole?: string;
}

export function DigivolutionEditor({ 
  digimonId, 
  digimonName: _digimonName, 
  currentDigivolutions,
  userRole 
}: DigivolutionEditorProps) {
  // Only show to Owner, Admin, Editor
  const canEdit = userRole && ['owner', 'admin', 'editor'].includes(userRole.toLowerCase());
  
  if (!canEdit) {
    return null;
  }

  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DigimonSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const [digivolvesFrom, setDigivolvesFrom] = useState(currentDigivolutions?.digivolvesFrom || []);
  const [digivolvesTo, setDigivolvesTo] = useState(currentDigivolutions?.digivolvesTo || []);
  const [jogress, setJogress] = useState(currentDigivolutions?.jogress || []);

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
        // Filter out current Digimon
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
    list: DigimonReference[], 
    setList: (list: DigimonReference[]) => void, 
    digimon: DigimonSearchResult
  ) => {
    if (!list.find(d => d.id === digimon.id)) {
      setList([...list, { id: digimon.id, name: digimon.name }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeFromList = (
    list: DigimonReference[], 
    setList: (list: DigimonReference[]) => void, 
    id: string
  ) => {
    setList(list.filter(d => d.id !== id));
  };

  const saveDigivolutions = async () => {
    try {
      const response = await fetch(`/api/digimon/${digimonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digivolutions: {
            digivolvesFrom: digivolvesFrom.map(d => d.id),
            digivolvesTo: digivolvesTo.map(d => d.id),
            jogress: jogress.map(d => d.id),
          }
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Digivolutions saved successfully!',
          variant: 'default',
        });
        setIsEditing(false);
        // Reload to show updated data
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const errorData = await response.json();
        toast({
          title: 'Save Failed',
          description: errorData.message || 'Failed to save digivolutions. Please try again.',
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
            <PlusIcon className="w-4 h-4 mr-2" />
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
          <CardTitle className="text-2xl text-orange-400">Edit Digivolution Paths</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsEditing(false)}
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Bar */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search Digimon..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              searchDigimon(e.target.value);
            }}
            className="w-full px-4 py-2 bg-[#1a1a1a] border border-orange-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          {isSearching && <p className="text-sm text-muted-foreground">Searching...</p>}
          {searchResults.length > 0 && (
            <div className="bg-[#1a1a1a] border border-orange-500/30 rounded-lg p-2 space-y-1 max-h-48 overflow-y-auto">
              {searchResults.map((digimon) => (
                <div key={digimon.id} className="text-sm text-muted-foreground hover:bg-orange-500/10 p-2 rounded cursor-pointer">
                  <div className="font-semibold">{digimon.name}</div>
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" variant="outline" onClick={() => addToList(digivolvesFrom, setDigivolvesFrom, digimon)}>
                      + From
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addToList(digivolvesTo, setDigivolvesTo, digimon)}>
                      + To
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addToList(jogress, setJogress, digimon)}>
                      + Jogress
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Digivolves From */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-blue-400">Digivolves From</h3>
          <div className="flex flex-wrap gap-2">
            {digivolvesFrom.map((digimon) => (
              <Badge key={digimon.id} variant="outline" className="bg-blue-500/10 border-blue-500/30">
                {digimon.name}
                <button onClick={() => removeFromList(digivolvesFrom, setDigivolvesFrom, digimon.id)} className="ml-2">
                  <XIcon className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {digivolvesFrom.length === 0 && (
              <p className="text-sm text-muted-foreground">No previous forms added</p>
            )}
          </div>
        </div>

        {/* Digivolves To */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-green-400">Digivolves To</h3>
          <div className="flex flex-wrap gap-2">
            {digivolvesTo.map((digimon) => (
              <Badge key={digimon.id} variant="outline" className="bg-green-500/10 border-green-500/30">
                {digimon.name}
                <button onClick={() => removeFromList(digivolvesTo, setDigivolvesTo, digimon.id)} className="ml-2">
                  <XIcon className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {digivolvesTo.length === 0 && (
              <p className="text-sm text-muted-foreground">No next forms added</p>
            )}
          </div>
        </div>

        {/* Jogress */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-purple-400">Jogress Partners</h3>
          <div className="flex flex-wrap gap-2">
            {jogress.map((digimon) => (
              <Badge key={digimon.id} variant="outline" className="bg-purple-500/10 border-purple-500/30">
                {digimon.name}
                <button onClick={() => removeFromList(jogress, setJogress, digimon.id)} className="ml-2">
                  <XIcon className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {jogress.length === 0 && (
              <p className="text-sm text-muted-foreground">No Jogress partners added</p>
            )}
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={saveDigivolutions}
          className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
        >
          <SaveIcon className="w-4 h-4 mr-2" />
          Save Digivolution Paths
        </Button>
      </CardContent>
    </Card>
  );
}
