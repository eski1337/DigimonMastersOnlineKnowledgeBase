import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Info, AlertTriangle, Lightbulb } from 'lucide-react';

/* ── Slate richText helpers ─────────────────────────────────────── */

function renderSlate(nodes: any[]): React.ReactNode {
  if (!nodes || !Array.isArray(nodes)) return null;
  return nodes.map((node, i) => {
    if (node.type === 'h1') return <h1 key={i} className="text-3xl font-bold mt-8 mb-4 text-foreground">{renderChildren(node.children)}</h1>;
    if (node.type === 'h2') return <h2 key={i} className="text-2xl font-bold mt-8 mb-4 text-foreground">{renderChildren(node.children)}</h2>;
    if (node.type === 'h3') return <h3 key={i} className="text-xl font-semibold mt-6 mb-3 text-foreground">{renderChildren(node.children)}</h3>;
    if (node.type === 'h4') return <h4 key={i} className="text-lg font-semibold mt-4 mb-2 text-foreground">{renderChildren(node.children)}</h4>;
    if (node.type === 'ul') return <ul key={i} className="list-disc pl-6 mb-4 space-y-1.5 text-muted-foreground">{renderSlate(node.children)}</ul>;
    if (node.type === 'ol') return <ol key={i} className="list-decimal pl-6 mb-4 space-y-1.5 text-muted-foreground">{renderSlate(node.children)}</ol>;
    if (node.type === 'li') {
      const inner = node.children?.[0]?.children ? renderChildren(node.children[0].children) : renderChildren(node.children);
      return <li key={i}>{inner}</li>;
    }
    if (node.type === 'blockquote') return <blockquote key={i} className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-4">{renderChildren(node.children)}</blockquote>;
    if (node.type === 'link') return <a key={i} href={node.url} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{renderChildren(node.children)}</a>;
    // Default paragraph
    const text = node.children?.map((c: any) => c.text).join('');
    if (text === '') return <div key={i} className="h-2" />;
    return <p key={i} className="mb-3 text-muted-foreground leading-relaxed">{renderChildren(node.children)}</p>;
  });
}

function renderChildren(children: any[]): React.ReactNode {
  if (!children) return null;
  return children.map((child, i) => {
    if (child.text !== undefined) {
      let el: React.ReactNode = child.text;
      if (child.bold) el = <strong key={i} className="text-foreground">{el}</strong>;
      if (child.italic) el = <em key={i}>{el}</em>;
      if (child.code) el = <code key={i} className="bg-muted px-1.5 py-0.5 rounded text-sm">{el}</code>;
      if (child.underline) el = <u key={i}>{el}</u>;
      if (child.strikethrough) el = <s key={i}>{el}</s>;
      return el;
    }
    if (child.type === 'link') {
      return <a key={i} href={child.url} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{renderChildren(child.children)}</a>;
    }
    if (child.children) return renderSlate([child]);
    return null;
  });
}

/* ── Block renderers ────────────────────────────────────────────── */

function RichTextBlock({ block }: { block: any }) {
  return <div>{renderSlate(block.content)}</div>;
}

function CalloutBlock({ block }: { block: any }) {
  const styles: Record<string, { border: string; bg: string; icon: React.ReactNode }> = {
    info: {
      border: 'border-primary/30',
      bg: 'bg-primary/5',
      icon: <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />,
    },
    warning: {
      border: 'border-orange-500/30',
      bg: 'bg-orange-500/5',
      icon: <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />,
    },
    tip: {
      border: 'border-green-500/30',
      bg: 'bg-green-500/5',
      icon: <Lightbulb className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />,
    },
  };
  const s = styles[block.type] || styles.info;

  return (
    <div className={`rounded-lg p-4 border ${s.border} ${s.bg} my-4`}>
      <div className="flex gap-3 items-start">
        {s.icon}
        <div className="flex-1 text-sm [&>p]:mb-2 [&>p:last-child]:mb-0">{renderSlate(block.content)}</div>
      </div>
    </div>
  );
}

interface CellLine {
  text?: string;
  amount?: string;
  icon?: { url: string } | null;
}

interface TableCell {
  value?: string;
  icon?: { url: string; alt?: string } | string | null;
  lines?: CellLine[];
}

function getIconUrl(icon: any): string | null {
  if (!icon) return null;
  if (typeof icon === 'object' && icon.url) return icon.url;
  return null;
}

function renderCellContent(cell: TableCell, isFirstCol: boolean) {
  const cellIcon = getIconUrl(cell.icon);
  const hasLines = cell.lines && cell.lines.length > 0;

  if (hasLines) {
    // Auto-detect layout: if all texts are short numbers → inline (cost), else vertical (materials)
    const isInline = cell.lines!.every(l => !l.text || l.text.length <= 6);

    if (isInline) {
      return (
        <div className="flex items-center gap-1 flex-wrap">
          {cell.lines!.map((line, k) => {
            const lineIcon = getIconUrl(line.icon);
            return (
              <span key={k} className="inline-flex items-center gap-0.5 whitespace-nowrap">
                {line.text && <span className="tabular-nums font-semibold">{line.text}</span>}
                {lineIcon && <img src={lineIcon} alt="" className="w-5 h-5 object-contain" />}
              </span>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        {cell.lines!.map((line, k) => {
          const lineIcon = getIconUrl(line.icon);
          return (
            <div key={k} className="flex items-center gap-2">
              {lineIcon && (
                <img src={lineIcon} alt="" className="w-7 h-7 object-contain shrink-0" />
              )}
              <span className={k === 0 && isFirstCol ? 'font-semibold text-foreground' : ''}>{line.text || ''}</span>
              {line.amount && (
                <span className="text-muted-foreground/80 tabular-nums ml-auto pl-3 whitespace-nowrap">{line.amount}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const value = cell.value || '';
  return (
    <div className="flex items-center gap-2">
      {cellIcon && (
        <img src={cellIcon} alt="" className="w-7 h-7 object-contain shrink-0" />
      )}
      <span>{value}</span>
    </div>
  );
}

function TableBlock({ block }: { block: any }) {
  const headers: string[] = (block.headers || []).map((h: any) => h.label);
  const rows: TableCell[][] = (block.rows || []).map((r: any) =>
    (r.cells || []).map((c: any) => ({
      value: c.value || '',
      icon: c.icon || null,
      lines: c.lines || null,
    }))
  );

  return (
    <div className="my-6">
      {block.title && <h3 className="text-xl font-semibold mb-3 text-foreground">{block.title}</h3>}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          {headers.length > 0 && (
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/50 first:rounded-tl-md last:rounded-tr-md whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-secondary/20 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-3 text-sm border-t border-border/50 align-top ${j === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {renderCellContent(cell, j === 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImageGridBlock({ block }: { block: any }) {
  const cols = block.columns || '4';
  const gridCols: Record<string, string> = {
    '2': 'grid-cols-2',
    '3': 'grid-cols-2 sm:grid-cols-3',
    '4': 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  };

  return (
    <div className="my-6">
      {block.title && <h2 className="text-2xl font-bold mb-4 text-foreground">{block.title}</h2>}
      <div className={`grid ${gridCols[cols] || gridCols['4']} gap-4`}>
        {(block.images || []).map((img: any, i: number) => {
          const src = img.image?.url || img.imageUrl;
          if (!src) return null;
          return (
            <Card key={i} className="text-center overflow-hidden">
              <CardContent className="pt-4 pb-3 px-3">
                <div className="relative w-full aspect-square max-w-[200px] mx-auto mb-3">
                  <img src={src} alt={img.caption || ''} className="w-full h-full object-contain" />
                </div>
                {img.caption && (
                  <span className="text-sm font-bold text-primary">{img.caption}</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main renderer ──────────────────────────────────────────────── */

export function BlockRenderer({ blocks }: { blocks: any[] }) {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return null;

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        switch (block.blockType) {
          case 'richText':
            return <RichTextBlock key={i} block={block} />;
          case 'callout':
            return <CalloutBlock key={i} block={block} />;
          case 'table':
            return <TableBlock key={i} block={block} />;
          case 'imageGrid':
            return <ImageGridBlock key={i} block={block} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
