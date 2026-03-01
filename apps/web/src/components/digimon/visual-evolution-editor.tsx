'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, SaveIcon, XIcon, TrashIcon, PlusIcon, LinkIcon, ZoomIn, ZoomOut, Grid3x3 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Image from 'next/image';

interface DigimonNode {
  id: string;
  name: string;
  icon?: string;
  x: number;
  y: number;
}

interface Connection {
  from: string;
  to: string;
  requiredLevel?: number;
  requiredItem?: string;
}

interface VisualEvolutionEditorProps {
  digimonId: string;
  digimonName: string;
  digimonSlug: string;
  userRole?: string;
}

interface DigimonSearchResult {
  id: string;
  name: string;
  icon?: { url: string } | string;
}

export function VisualEvolutionEditor({
  digimonId,
  digimonName,
  digimonSlug: _digimonSlug,
  userRole
}: VisualEvolutionEditorProps) {
  // Strict role check - Only Owner, Admin, and Editor can access
  const allowedRoles = ['owner', 'admin', 'editor'];
  const canEdit = userRole && allowedRoles.includes(userRole.toLowerCase());
  
  // Return null if user doesn't have permission (component won't render)
  if (!canEdit) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [nodes, setNodes] = useState<DigimonNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DigimonSearchResult[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [gridSnap, setGridSnap] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [_panOffset, _setPanOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const GRID_SIZE = 50;
  const snapToGrid = (value: number) => {
    if (!gridSnap) return value;
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  const loadCurrentEvolutionData = async () => {
    setIsLoading(true);
    try {
      const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';
      
      // First, check if this Digimon has an evolution line assigned
      const digimonResponse = await fetch(`${CMS_URL}/api/digimon/${digimonId}?depth=1`);
      if (!digimonResponse.ok) throw new Error('Failed to load Digimon');
      const digimon = await digimonResponse.json();
      
      // If there's an evolution line, load it instead
      if (digimon.evolutionLine) {
        const evolutionLineId = typeof digimon.evolutionLine === 'string' 
          ? digimon.evolutionLine 
          : digimon.evolutionLine.id;
        
        const lineResponse = await fetch(`${CMS_URL}/api/evolution-lines/${evolutionLineId}`);
        if (lineResponse.ok) {
          const evolutionLine = await lineResponse.json();
          
          if (evolutionLine.visualLayout && evolutionLine.visualLayout.nodes) {
            // Load the saved visual layout
            setNodes(evolutionLine.visualLayout.nodes || []);
            setConnections(evolutionLine.visualLayout.connections || []);
            
            toast({
              title: 'Evolution Line Loaded!',
              description: `Loaded ${evolutionLine.visualLayout.nodes.length} Digimon from shared evolution line`,
            });
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Fallback: Load from current Digimon's digivolutions
      const response = await fetch(`${CMS_URL}/api/digimon/${digimonId}?depth=2`);
      if (!response.ok) throw new Error('Failed to load');
      const fullDigimon = await response.json();
      
      const newNodes: DigimonNode[] = [];
      const newConnections: Connection[] = [];
      let xPosition = 100;
      const yPosition = 200;

      // Helper function to get icon URL with X-Antibody fallback
      const getIconUrl = (icon: any, _digimonName?: string): string | undefined => {
        if (!icon) {
          return undefined;
        }
        
        // If it's a string URL, return it
        if (typeof icon === 'string') {
          return icon.startsWith('http') ? icon : `${CMS_URL}${icon}`;
        }
        
        // If it's an object with url property
        if (typeof icon === 'object') {
          if (icon.url) {
            return icon.url.startsWith('http') ? icon.url : `${CMS_URL}${icon.url}`;
          }
          // Sometimes the icon object has other properties
          if (icon.filename) {
            return `${CMS_URL}/media/${icon.filename}`;
          }
        }
        
        return undefined;
      };

      // Helper function to safely fetch related Digimon data
      const fetchRelatedDigimon = async (ref: any) => {
        if (!ref) return null;
        
        // If it's already an object with data, use it
        if (typeof ref === 'object' && ref.name) {
          let iconUrl = getIconUrl(ref.icon, ref.name);
          
          // X-Antibody fallback: try to get non-X version icon
          if (!iconUrl && ref.name && ref.name.includes(' X')) {
            const nonXName = ref.name.replace(' X', '').trim();
            try {
              const nonXRes = await fetch(`${CMS_URL}/api/digimon?where[name][equals]=${encodeURIComponent(nonXName)}&limit=1`);
              if (nonXRes.ok) {
                const nonXData = await nonXRes.json();
                if (nonXData.docs?.[0]?.icon) {
                  iconUrl = getIconUrl(nonXData.docs[0].icon);
                }
              }
            } catch (e) {
              console.log('X-Antibody fallback failed for:', ref.name);
            }
          }
          
          return {
            id: ref.id || ref.name,
            name: ref.name,
            icon: iconUrl,
          };
        }
        
        // If it's just an ID string, fetch the data
        if (typeof ref === 'string') {
          try {
            const res = await fetch(`${CMS_URL}/api/digimon/${ref}`);
            if (res.ok) {
              const data = await res.json();
              let iconUrl = getIconUrl(data.icon, data.name);
              
              // X-Antibody fallback
              if (!iconUrl && data.name && data.name.includes(' X')) {
                const nonXName = data.name.replace(' X', '').trim();
                try {
                  const nonXRes = await fetch(`${CMS_URL}/api/digimon?where[name][equals]=${encodeURIComponent(nonXName)}&limit=1`);
                  if (nonXRes.ok) {
                    const nonXData = await nonXRes.json();
                    if (nonXData.docs?.[0]?.icon) {
                      iconUrl = getIconUrl(nonXData.docs[0].icon);
                    }
                  }
                } catch (e) {
                  console.log('X-Antibody fallback failed for:', data.name);
                }
              }
              
              return {
                id: data.id,
                name: data.name,
                icon: iconUrl,
              };
            } else if (res.status === 404) {
              console.warn(`Digimon with ID ${ref} not found (404) - skipping`);
              return null;
            }
          } catch (e) {
            console.error('Failed to fetch related Digimon:', ref, e);
          }
        }
        
        return null;
      };

      // Add digivolvesFrom (previous forms)
      if (fullDigimon.digivolutions?.digivolvesFrom?.length > 0) {
        for (const prev of fullDigimon.digivolutions.digivolvesFrom) {
          // Prioritize ID over name to avoid 404 errors
          const prevData = await fetchRelatedDigimon(prev.id || prev);
          if (prevData) {
            newNodes.push({
              id: prevData.id,
              name: prevData.name,
              icon: prevData.icon,
              x: xPosition,
              y: yPosition,
            });
            newConnections.push({
              from: prevData.id,
              to: digimonId,
              requiredLevel: prev.requiredLevel,
              requiredItem: prev.requiredItem,
            });
            xPosition += 150;
          }
        }
      }

      // Add current Digimon
      let currentIcon = getIconUrl(fullDigimon.icon, fullDigimon.name);
      
      // X-Antibody fallback for current Digimon
      if (!currentIcon && fullDigimon.name && fullDigimon.name.includes(' X')) {
        const nonXName = fullDigimon.name.replace(' X', '').trim();
        try {
          const nonXRes = await fetch(`${CMS_URL}/api/digimon?where[name][equals]=${encodeURIComponent(nonXName)}&limit=1`);
          if (nonXRes.ok) {
            const nonXData = await nonXRes.json();
            if (nonXData.docs?.[0]?.icon) {
              currentIcon = getIconUrl(nonXData.docs[0].icon);
            }
          }
        } catch (e) {
          console.log('X-Antibody fallback failed for current Digimon');
        }
      }
      
      newNodes.push({
        id: digimonId,
        name: digimonName,
        icon: currentIcon,
        x: xPosition,
        y: yPosition,
      });
      xPosition += 150;

      // Add digivolvesTo (next forms)
      if (fullDigimon.digivolutions?.digivolvesTo?.length > 0) {
        let branchYPosition = yPosition;
        for (const next of fullDigimon.digivolutions.digivolvesTo) {
          // Prioritize ID over name to avoid 404 errors
          const nextData = await fetchRelatedDigimon(next.id || next);
          if (nextData) {
            newNodes.push({
              id: nextData.id,
              name: nextData.name,
              icon: nextData.icon,
              x: xPosition,
              y: branchYPosition,
            });
            newConnections.push({
              from: digimonId,
              to: nextData.id,
              requiredLevel: next.requiredLevel,
              requiredItem: next.requiredItem,
            });
            branchYPosition += 100;
          }
        }
      }

      setNodes(newNodes);
      setConnections(newConnections);
      
      toast({
        title: 'Current Data Loaded!',
        description: `Loaded ${newNodes.length} Digimon and ${newConnections.length} connections`,
      });
    } catch (error) {
      console.error('Load error:', error);
      toast({
        title: 'Load Failed',
        description: error instanceof Error ? error.message : 'Could not load current evolution data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchDigimon = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';
      const response = await fetch(
        `${CMS_URL}/api/digimon?where[name][like]=${encodeURIComponent(query)}&limit=20`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.docs || []);
      } else {
        console.error('Search failed with status:', response.status);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const addNode = async (digimon: DigimonSearchResult) => {
    const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';
    
    // Extract icon URL with proper handling
    let iconUrl: string | undefined;
    if (typeof digimon.icon === 'string') {
      iconUrl = digimon.icon.startsWith('http') ? digimon.icon : `${CMS_URL}${digimon.icon}`;
    } else if (digimon.icon && typeof digimon.icon === 'object') {
      if (digimon.icon.url) {
        iconUrl = digimon.icon.url.startsWith('http') ? digimon.icon.url : `${CMS_URL}${digimon.icon.url}`;
      } else if ('filename' in digimon.icon && typeof (digimon.icon as any).filename === 'string') {
        iconUrl = `${CMS_URL}/media/${(digimon.icon as any).filename}`;
      }
    }

    // X-Antibody fallback: if no icon and name contains X, try non-X version
    if (!iconUrl && digimon.name && digimon.name.includes(' X')) {
      const nonXName = digimon.name.replace(' X', '').trim();
      try {
        const nonXRes = await fetch(`${CMS_URL}/api/digimon?where[name][equals]=${encodeURIComponent(nonXName)}&limit=1`);
        if (nonXRes.ok) {
          const nonXData = await nonXRes.json();
          if (nonXData.docs?.[0]?.icon) {
            const nonXIcon = nonXData.docs[0].icon;
            if (typeof nonXIcon === 'string') {
              iconUrl = nonXIcon.startsWith('http') ? nonXIcon : `${CMS_URL}${nonXIcon}`;
            } else if (nonXIcon.url) {
              iconUrl = nonXIcon.url.startsWith('http') ? nonXIcon.url : `${CMS_URL}${nonXIcon.url}`;
            } else if (nonXIcon.filename) {
              iconUrl = `${CMS_URL}/media/${nonXIcon.filename}`;
            }
          }
        }
      } catch (e) {
        console.log('X-Antibody fallback failed for:', digimon.name);
      }
    }

    // Calculate spawn position in a grid pattern
    const cols = 5; // 5 icons per row
    const row = Math.floor(nodes.length / cols);
    const col = nodes.length % cols;
    
    const x = snapToGrid(100 + col * 150);
    const y = snapToGrid(100 + row * 120);

    const newNode: DigimonNode = {
      id: digimon.id,
      name: digimon.name,
      icon: iconUrl,
      x,
      y,
    };

    setNodes([...nodes, newNode]);
    setSearchQuery('');
    setSearchResults([]);
    
    toast({
      title: 'Digimon Added',
      description: `${digimon.name} added to canvas`,
    });
  };

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setConnections(connections.filter(c => c.from !== nodeId && c.to !== nodeId));
    if (selectedNode === nodeId) setSelectedNode(null);
    if (connectingFrom === nodeId) setConnectingFrom(null);
  };

  const startConnection = (nodeId: string) => {
    if (connectingFrom === nodeId) {
      setConnectingFrom(null);
    } else if (connectingFrom) {
      // Create connection
      const newConnection: Connection = {
        from: connectingFrom,
        to: nodeId,
      };
      setConnections([...connections, newConnection]);
      setConnectingFrom(null);
      toast({
        title: 'Connection Created',
        description: 'Evolution path connected',
      });
    } else {
      setConnectingFrom(nodeId);
    }
  };

  const removeConnection = (from: string, to: string) => {
    setConnections(connections.filter(c => !(c.from === from && c.to === to)));
  };

  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate mouse position relative to canvas, accounting for zoom
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;

    setDragging(nodeId);
    setDragOffset({
      x: mouseX - node.x,
      y: mouseY - node.y,
    });
    setSelectedNode(nodeId);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Middle mouse button (wheel button) = button 1
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle canvas panning with middle mouse button
    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      
      if (canvasRef.current) {
        canvasRef.current.scrollLeft -= deltaX;
        canvasRef.current.scrollTop -= deltaY;
      }
      
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handle node dragging
    if (!dragging) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate mouse position relative to canvas
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;

    // Calculate new node position
    let x = mouseX - dragOffset.x;
    let y = mouseY - dragOffset.y;

    // Apply grid snapping
    x = snapToGrid(x);
    y = snapToGrid(y);

    // Clamp to canvas bounds
    x = Math.max(0, Math.min(x, 1500));
    y = Math.max(0, Math.min(y, 800));

    setNodes(nodes.map(n => 
      n.id === dragging ? { ...n, x, y } : n
    ));
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 1) {
      setIsPanning(false);
    }
    setDragging(null);
  };

  const saveLayout = async () => {
    try {
      // Save through Next.js API route (handles authentication)
      const response = await fetch(`/api/digimon/${digimonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visualEvolutionLayout: {
            nodes,
            connections,
          },
        }),
      });

      if (response.ok) {
        toast({
          title: 'Layout Saved!',
          description: 'Evolution tree layout saved successfully',
        });
      } else {
        const errorData = await response.json();
        if (response.status === 403) {
          toast({
            title: 'Permission Denied',
            description: 'Only Owner, Admin, and Editor roles can save layouts',
            variant: 'destructive',
          });
        } else if (response.status === 401) {
          toast({
            title: 'Not Authenticated',
            description: 'Please log in to save layouts',
            variant: 'destructive',
          });
        } else {
          throw new Error(errorData.error || 'Failed to save');
        }
      }
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Could not save evolution layout',
        variant: 'destructive',
      });
    }
  };

  const applyToDigivolutions = async () => {
    try {
      // Extract all unique Digimon IDs from nodes
      const digimonInLine = [...new Set(nodes.map(n => n.id))];
      
      // Create evolution line name based on root Digimon
      const evolutionLineName = `${digimonName} Evolution Line`;
      
      // Prepare visual layout data
      const visualLayout = {
        nodes: nodes.map(n => ({
          id: n.id,
          name: n.name,
          icon: n.icon,
          x: n.x,
          y: n.y,
        })),
        connections: connections.map(c => ({
          from: c.from,
          to: c.to,
          requiredLevel: c.requiredLevel,
          requiredItem: c.requiredItem,
        })),
      };

      // Check if current Digimon already has an evolution line
      const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';
      const digimonResponse = await fetch(`${CMS_URL}/api/digimon/${digimonId}`);
      const digimonData = await digimonResponse.json();
      
      let evolutionLineId = null;
      if (typeof digimonData.evolutionLine === 'object' && digimonData.evolutionLine !== null) {
        evolutionLineId = digimonData.evolutionLine.id;
      } else if (typeof digimonData.evolutionLine === 'string') {
        evolutionLineId = digimonData.evolutionLine;
      }

      let response;
      
      if (evolutionLineId) {
        // Update existing evolution line
        response = await fetch(`/api/evolution-lines/${evolutionLineId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: evolutionLineName,
            rootDigimon: digimonId,
            visualLayout,
            digimonInLine,
            isPublic: true,
          }),
        });
      } else {
        // Create new evolution line
        response = await fetch(`/api/evolution-lines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: evolutionLineName,
            rootDigimon: digimonId,
            description: `Evolution line for ${digimonName} and related Digimon`,
            visualLayout,
            digimonInLine,
            isPublic: true,
          }),
        });
      }

      if (response.ok) {
        toast({
          title: 'Evolution Line Saved!',
          description: `Shared evolution tree saved. All ${digimonInLine.length} Digimon will show this tree.`,
        });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save evolution line');
      }
    } catch (error) {
      console.error('Apply error:', error);
      toast({
        title: 'Apply Failed',
        description: error instanceof Error ? error.message : 'Could not save evolution line',
        variant: 'destructive',
      });
    }
  };

  const getConnectionPath = (from: DigimonNode, to: DigimonNode) => {
    const startX = from.x + 32; // Center of icon (64px / 2)
    const startY = from.y + 32;
    const endX = to.x + 32;
    const endY = to.y + 32;

    // Create orthogonal (90-degree angle) connections
    // If same Y level, just draw horizontal line
    if (Math.abs(startY - endY) < 5) {
      return `M ${startX} ${startY} L ${endX} ${endY}`;
    }

    // Otherwise, create step pattern: horizontal -> vertical -> horizontal
    const midX = startX + (endX - startX) / 2;
    
    return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
  };

  if (!isOpen) {
    return (
      <Card className="bg-gradient-to-br from-[#1d2021] to-[#282828] border-orange-500/30">
        <CardContent className="pt-6">
          <Button 
            onClick={() => setIsOpen(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Open Visual Evolution Editor
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1d2021] to-[#282828] border-orange-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-2xl text-orange-400">Visual Evolution Editor</CardTitle>
            <Badge variant="outline" className="bg-purple-900/30 border-purple-500/50 text-purple-300 text-xs">
              Admin Feature
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={loadCurrentEvolutionData}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : (
                <>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Load Current Data
                </>
              )}
            </Button>
            <Button 
              onClick={saveLayout}
              className="bg-green-600 hover:bg-green-700"
            >
              <SaveIcon className="w-4 h-4 mr-2" />
              Save Layout
            </Button>
            <Button 
              onClick={applyToDigivolutions}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Apply to Data
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search Digimon to add to canvas..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchDigimon(e.target.value);
                }}
                className="pl-10 bg-[#1a1a1a] border-orange-500/30 text-white"
              />
            </div>
          </div>
          
          {searchResults.length > 0 && (
            <div className="bg-[#1a1a1a] border border-orange-500/30 rounded-lg p-2 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {searchResults.map((digimon) => (
                  <button
                    key={digimon.id}
                    onClick={() => addNode(digimon)}
                    className="flex items-center gap-2 p-2 hover:bg-orange-500/10 rounded-lg border border-orange-500/20 text-left"
                  >
                    {digimon.icon && (
                      <div className="relative w-8 h-8 flex-shrink-0">
                        <Image
                          src={typeof digimon.icon === 'string' ? digimon.icon : digimon.icon.url}
                          alt={digimon.name}
                          fill
                          sizes="(max-width: 768px) 50px, 64px"
                          className="object-contain"
                        />
                      </div>
                    )}
                    <span className="text-sm text-white truncate">{digimon.name}</span>
                    <PlusIcon className="w-4 h-4 text-green-400 ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
          <p className="text-sm text-blue-300">
            <strong>To Edit Existing:</strong> Click "<strong>Load Current Data</strong>" to load {digimonName}'s current evolution paths. 
            {' '}<strong>To Create New:</strong> Search and add Digimon to blank canvas.
            {' '}Drag icons to position. Click "Link" on two icons to connect them.
            {' '}<strong className="text-purple-300">🖱️ Pan Canvas:</strong> Hold middle mouse button (wheel) and drag.
            {connectingFrom && <span className="text-yellow-400 ml-2">→ Click another Digimon to complete connection</span>}
          </p>
        </div>

        {/* Canvas Controls */}
        <div className="flex items-center justify-between gap-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Zoom:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="h-8 px-2"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-mono text-white min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              className="h-8 px-2"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(1)}
              className="h-8 px-3 text-xs"
            >
              Reset
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={gridSnap ? "default" : "outline"}
              onClick={() => setGridSnap(!gridSnap)}
              className="h-8 px-3 text-xs"
            >
              <Grid3x3 className="w-4 h-4 mr-1" />
              Grid Snap {gridSnap ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative">
          <div
            ref={canvasRef}
            className="relative w-full h-[600px] bg-gray-900/50 border-2 border-orange-500/30 rounded-lg overflow-auto"
            style={{ cursor: isPanning ? 'grabbing' : 'default' }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Zoom Container */}
            <div 
              style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: '1600px',
                height: '1000px',
              }}
            >
              {/* Grid Background */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                  backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                  width: `${100 * zoom}%`,
                  height: `${100 * zoom}%`,
                }}
              />

              {/* Connection Lines (SVG) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ width: `${100 * zoom}%`, height: `${100 * zoom}%` }}>
              {connections.map((conn, index) => {
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode = nodes.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return null;

                return (
                  <g key={index}>
                    <path
                      d={getConnectionPath(fromNode, toNode)}
                      stroke="#fb923c"
                      strokeWidth="2"
                      fill="none"
                      markerEnd="url(#arrowhead)"
                    />
                  </g>
                );
              })}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill="#fb923c" />
                </marker>
              </defs>
            </svg>

            {/* Digimon Nodes */}
            {nodes.map((node) => (
              <div
                key={node.id}
                className={`absolute cursor-move select-none ${
                  selectedNode === node.id ? 'ring-2 ring-orange-400 z-10' : ''
                } ${connectingFrom === node.id ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                }}
                onMouseDown={(e) => handleMouseDown(node.id, e)}
              >
                <div className="flex flex-col items-center gap-1 bg-gray-800/90 rounded-lg p-2 border-2 border-orange-500/50 hover:border-orange-400 transition-all">
                  {node.icon && (
                    <div className="relative w-16 h-16">
                      <Image
                        src={node.icon}
                        alt={node.name}
                        fill
                        sizes="(max-width: 768px) 50px, 64px"
                        className="object-contain"
                      />
                    </div>
                  )}
                  <span className="text-xs text-white font-semibold text-center w-20 truncate">
                    {node.name}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs bg-green-600/20 hover:bg-green-600/40 text-green-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        startConnection(node.id);
                      }}
                    >
                      <LinkIcon className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNode(node.id);
                      }}
                    >
                      <TrashIcon className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold">Empty Canvas</p>
                  <p className="text-sm">Search and add Digimon to get started</p>
                </div>
              </div>
            )}
            </div>
            {/* End Zoom Container */}
          </div>
        </div>

        {/* Current Connections List */}
        {connections.length > 0 && (
          <div className="bg-gray-900/50 border border-orange-500/30 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-orange-400 mb-3">Active Connections:</h3>
            <div className="space-y-2">
              {connections.map((conn, index) => {
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode = nodes.find(n => n.id === conn.to);
                return (
                  <div key={index} className="flex items-center justify-between bg-gray-800/50 rounded p-2">
                    <span className="text-sm text-white">
                      {fromNode?.name} → {toNode?.name}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeConnection(conn.from, conn.to)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
