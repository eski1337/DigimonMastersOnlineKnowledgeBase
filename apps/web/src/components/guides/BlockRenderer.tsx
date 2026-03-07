import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Info, AlertTriangle, Lightbulb } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/icon-paths';

/** Resolve image src: CMS relative paths get the CMS base URL prepended, absolute URLs pass through */
function resolveImgSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.startsWith('http')) return src;
  const resolved = resolveMediaUrl(src);
  return resolved || null;
}

/* ── Slate types ───────────────────────────────────────────────── */

interface SlateNode {
  type?: string;
  url?: string;
  text?: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  children?: SlateNode[];
}

interface MediaRef {
  url: string;
  alt?: string;
}

interface RichTextBlock {
  blockType: 'richText';
  content: SlateNode[];
}

interface CalloutBlock {
  blockType: 'callout';
  type: string;
  content: SlateNode[];
}

interface TableHeader {
  label: string;
}

interface TableRow {
  cells: Array<{
    value?: string;
    icon?: MediaRef | string | null;
    iconUrl?: string;
    lines?: Array<{ text?: string; amount?: string; icon?: MediaRef | null; iconUrl?: string }>;
  }>;
}

interface TableBlockData {
  blockType: 'table';
  title?: string;
  headers?: TableHeader[];
  rows?: TableRow[];
}

interface ImageGridImage {
  image?: MediaRef;
  imageUrl?: string;
  caption?: string;
}

interface ImageGridBlockData {
  blockType: 'imageGrid';
  title?: string;
  columns?: string;
  images?: ImageGridImage[];
}

interface ImageBlockData {
  blockType: 'image';
  image?: MediaRef;
  imageUrl?: string;
  caption?: string;
  size?: string;
}

type GuideBlock = RichTextBlock | CalloutBlock | TableBlockData | ImageGridBlockData | ImageBlockData;

/* ── Slate richText helpers ─────────────────────────────────────── */

function renderSlate(nodes: SlateNode[]): React.ReactNode {
  if (!nodes || !Array.isArray(nodes)) return null;
  return nodes.map((node, i) => {
    if (node.type === 'h1') return <h1 key={i} className="text-3xl font-bold mt-5 mb-2 text-foreground">{renderChildren(node.children)}</h1>;
    if (node.type === 'h2') return <h2 key={i} className="text-2xl font-bold mt-5 mb-2 text-foreground">{renderChildren(node.children)}</h2>;
    if (node.type === 'h3') return <h3 key={i} className="text-xl font-semibold mt-4 mb-1.5 text-foreground">{renderChildren(node.children)}</h3>;
    if (node.type === 'h4') return <h4 key={i} className="text-lg font-semibold mt-3 mb-1 text-foreground">{renderChildren(node.children)}</h4>;
    if (node.type === 'ul') return <ul key={i} className="list-disc pl-5 mb-2 space-y-0.5 text-muted-foreground text-sm">{renderSlate(node.children ?? [])}</ul>;
    if (node.type === 'ol') return <ol key={i} className="list-decimal pl-5 mb-2 space-y-0.5 text-muted-foreground text-sm">{renderSlate(node.children ?? [])}</ol>;
    if (node.type === 'li') {
      const inner = node.children?.[0]?.children ? renderChildren(node.children[0].children) : renderChildren(node.children);
      return <li key={i}>{inner}</li>;
    }
    if (node.type === 'blockquote') return <blockquote key={i} className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-4">{renderChildren(node.children)}</blockquote>;
    if (node.type === 'link') return <a key={i} href={node.url} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{renderChildren(node.children)}</a>;
    // Default paragraph
    const text = node.children?.map((c) => c.text).join('');
    if (text === '') return <div key={i} className="h-1" />;
    return <p key={i} className="mb-1.5 text-muted-foreground leading-normal text-sm">{renderChildren(node.children)}</p>;
  });
}

function renderChildren(children?: SlateNode[]): React.ReactNode {
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

function RichTextBlockView({ block }: { block: RichTextBlock }) {
  return <div>{renderSlate(block.content)}</div>;
}

function CalloutBlockView({ block }: { block: CalloutBlock }) {
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
    <div className={`rounded-lg p-3 border ${s.border} ${s.bg} my-2`}>
      <div className="flex gap-3 items-start">
        {s.icon}
        <div className="flex-1 text-sm [&>p]:mb-1 [&>p:last-child]:mb-0">{renderSlate(block.content)}</div>
      </div>
    </div>
  );
}

interface CellLine {
  text?: string;
  amount?: string;
  icon?: { url: string } | null;
  iconUrl?: string;
}

interface TableCell {
  value?: string;
  icon?: { url: string; alt?: string } | string | null;
  iconUrl?: string;
  lines?: CellLine[];
}

function getIconUrl(icon: MediaRef | string | null | undefined, iconUrl?: string): string | null {
  if (iconUrl) return resolveImgSrc(iconUrl);
  if (!icon) return null;
  if (typeof icon === 'object' && icon.url) return resolveImgSrc(icon.url);
  return null;
}

const CURRENCY_ICONS = {
  T: '/guides/Currency_Tera.png',
  M: '/guides/Currency_Mega.png',
  B: '/guides/Currency_Bit.png',
};

/* Auto-match item names → icon paths (checked via substring match on cell value / line text) */
const ITEM_ICON_MAP: [RegExp, string][] = [
  [/Cherry Blossom.*Xros Loader/i, '/guides/xros-loader/Cherry_Blossom-Xros_Loader.png'],
  [/Decidious.*Xros Loader/i, '/guides/xros-loader/Decidious-Xros_Loader.png'],
  [/Digimon Xros Loader|Xros Loader Lv/i, '/guides/xros-loader/XrosLoader.png'],
  [/Digicode Piece/i, '/guides/xros-loader/Digicode_Piece.png'],
  [/Digicode/i, '/guides/xros-loader/Digicode.png'],
  [/Option Change Stone/i, '/guides/xros-loader/Option_Change_Stone.png'],
  [/Number Change Stone/i, '/guides/xros-loader/Number_Change_Stone.png'],
  [/Adventure Goggles Box/i, '/guides/adventure-goggles/Adventure_goggles_box.png'],
  [/Adventure Goggles|Goggles Lv/i, '/guides/adventure-goggles/Adventure_goggles1.png'],
  [/Contaminated X-Antibody/i, '/guides/adventure-goggles/Contaminated_X-Antibody_-_CORE.png'],
  [/^Money$/i, '/guides/xros-loader/Coin_Currency.png'],
];

function autoIcon(text: string): string | null {
  for (const [re, url] of ITEM_ICON_MAP) {
    if (re.test(text)) return url;
  }
  return null;
}

function formatCurrency(value: string): React.ReactNode {
  // Match numbers like "30,000,000" or "115,590,890"
  const raw = value.replace(/,/g, '');
  if (!/^\d+$/.test(raw) || raw.length < 4) return null;
  const num = parseInt(raw, 10);
  if (num < 1000) return null;
  const tera = Math.floor(num / 1_000_000);
  const mega = Math.floor((num % 1_000_000) / 1_000);
  const bit = num % 1_000;
  const parts: React.ReactNode[] = [];
  if (tera > 0) {
    parts.push(<span key="t" className="inline-flex items-center gap-0.5"><span className="tabular-nums font-semibold">{tera}</span><img src={CURRENCY_ICONS.T} alt="T" className="w-4 h-4 object-contain inline" /></span>);
  }
  parts.push(<span key="m" className="inline-flex items-center gap-0.5"><span className="tabular-nums font-semibold">{String(mega).padStart(tera > 0 ? 3 : 1, '0')}</span><img src={CURRENCY_ICONS.M} alt="M" className="w-4 h-4 object-contain inline" /></span>);
  parts.push(<span key="b" className="inline-flex items-center gap-0.5"><span className="tabular-nums font-semibold">{String(bit).padStart(3, '0')}</span><img src={CURRENCY_ICONS.B} alt="B" className="w-4 h-4 object-contain inline" /></span>);
  return <span className="inline-flex items-center gap-1 flex-wrap">{parts}</span>;
}

function renderCellContent(cell: TableCell, isFirstCol: boolean) {
  const cellIcon = getIconUrl(cell.icon, cell.iconUrl) || autoIcon(cell.value || '');
  const hasLines = cell.lines && cell.lines.length > 0;

  if (hasLines) {
    // Auto-detect layout: if all texts are short numbers → inline (cost), else vertical (materials)
    const isInline = cell.lines!.every(l => !l.text || l.text.length <= 6);

    if (isInline) {
      return (
        <div className="flex items-center gap-1 flex-wrap">
          {cell.lines!.map((line, k) => {
            const lineIcon = getIconUrl(line.icon, line.iconUrl) || autoIcon(line.text || '');
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
          const lineIcon = getIconUrl(line.icon, line.iconUrl) || autoIcon(line.text || '');
          return (
            <div key={k} className="flex items-center gap-2">
              {lineIcon && (
                <img src={lineIcon} alt="" className="w-5 h-5 object-contain shrink-0" />
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
  const currency = formatCurrency(value);
  return (
    <div className="flex items-center gap-2">
      {cellIcon && (
        <img src={cellIcon} alt="" className="w-5 h-5 object-contain shrink-0" />
      )}
      {currency || <span>{value}</span>}
    </div>
  );
}

function TableBlockView({ block }: { block: TableBlockData }) {
  const headers: string[] = (block.headers || []).map((h) => h.label);
  const rows: TableCell[][] = (block.rows || []).map((r) =>
    (r.cells || []).map((c) => ({
      value: c.value || '',
      icon: c.icon || null,
      iconUrl: c.iconUrl || undefined,
      lines: c.lines?.map((l) => ({ ...l, iconUrl: l.iconUrl || undefined })) || undefined,
    }))
  );

  return (
    <div className="my-3">
      {block.title && <h3 className="text-lg font-semibold mb-1.5 text-foreground">{block.title}</h3>}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          {headers.length > 0 && (
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/50 first:rounded-tl-md last:rounded-tr-md whitespace-nowrap">
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
                  <td key={j} className={`px-3 py-1.5 text-sm border-t border-border/50 align-middle ${j === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
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

function ImageGridBlockView({ block }: { block: ImageGridBlockData }) {
  const cols = block.columns || '4';
  const gridCols: Record<string, string> = {
    '2': 'grid-cols-2',
    '3': 'grid-cols-2 sm:grid-cols-3',
    '4': 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  };

  return (
    <div className="my-3">
      {block.title && <h2 className="text-xl font-bold mb-2 text-foreground">{block.title}</h2>}
      <div className={`grid ${gridCols[cols] || gridCols['4']} gap-3`}>
        {(block.images || []).map((img, i) => {
          const src = resolveImgSrc(img.image?.url) || resolveImgSrc(img.imageUrl);
          if (!src) return null;
          return (
            <Card key={i} className="text-center overflow-hidden">
              <CardContent className="pt-3 pb-2 px-2">
                <div className="relative w-full aspect-square max-w-[140px] mx-auto mb-2">
                  <img src={src} alt={img.caption || ''} className="w-full h-full object-contain" />
                </div>
                {img.caption && (
                  <span className="text-xs font-bold text-primary leading-tight">{img.caption}</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ImageBlockView({ block }: { block: ImageBlockData }) {
  const src = resolveImgSrc(block.image?.url) || resolveImgSrc(block.imageUrl);
  if (!src) return null;

  const sizeClasses: Record<string, string> = {
    small: 'max-w-xs',
    medium: 'max-w-lg',
    large: 'max-w-full',
  };
  const sizeClass = (block.size && sizeClasses[block.size]) || sizeClasses.large;

  return (
    <figure className={`my-3 ${sizeClass} mx-auto`}>
      <div className="rounded-lg overflow-hidden border border-border/50 bg-secondary/20">
        <img src={src} alt={block.caption || ''} className="w-full h-auto object-contain" />
      </div>
      {block.caption && (
        <figcaption className="text-center text-xs text-muted-foreground mt-1 italic">{block.caption}</figcaption>
      )}
    </figure>
  );
}

/* ── Main renderer ──────────────────────────────────────────────── */

export function BlockRenderer({ blocks }: { blocks: GuideBlock[] }) {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return null;

  return (
    <div className="space-y-1">
      {blocks.map((block, i) => {
        switch (block.blockType) {
          case 'richText':
            return <RichTextBlockView key={i} block={block} />;
          case 'callout':
            return <CalloutBlockView key={i} block={block} />;
          case 'table':
            return <TableBlockView key={i} block={block} />;
          case 'imageGrid':
            return <ImageGridBlockView key={i} block={block} />;
          case 'image':
            return <ImageBlockView key={i} block={block} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
