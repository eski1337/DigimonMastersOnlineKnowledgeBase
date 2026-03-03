import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Xros Loader Guide - DMO KB',
  description: 'Complete crafting guide for the Xros Loader and Fusion Loader in Digimon Masters Online. Materials, costs, and crafting steps.',
};

/* ─── Image Paths ──────────────────────────────────────────────────────── */

const IMG = '/images/guides/xros-loader';

const itemIcon: Record<string, string> = {
  'Digimon Xros Loader Lv 0': `${IMG}/XrosLoader.png`,
  'Digimon Xros Loader Lv 1': `${IMG}/XrosLoader.png`,
  'Digimon Xros Loader Lv 2': `${IMG}/XrosLoader.png`,
  'Digimon Xros Loader Lv 3': `${IMG}/XrosLoader.png`,
  'Digimon Xros Loader Lv 4': `${IMG}/XrosLoader.png`,
  'Digimon Xros Loader Lv 5': `${IMG}/XrosLoader.png`,
  'Digimon Xros Loader Lv 6': `${IMG}/XrosLoader.png`,
  'Digimon Xros Loader Lv 7': `${IMG}/XrosLoader.png`,
  'Digimon Xros Loader Lv 8': `${IMG}/XrosLoader.png`,
  'Digimon Xros Loader Lv 9': `${IMG}/XrosLoader.png`,
  'Digimon Xros Loader Lv 10': `${IMG}/XrosLoader.png`,
  'Cherry Blossom-Xros Loader': `${IMG}/Cherry_Blossom-Xros_Loader.png`,
  'Decidious-Xros Loader': `${IMG}/Decidious-Xros_Loader.png`,
  'Digicode': `${IMG}/Digicode.png`,
  'Digicode Piece': `${IMG}/Digicode_Piece.png`,
  'Option Change Stone': `${IMG}/Option_Change_Stone.png`,
  'Number Change Stone': `${IMG}/Number_Change_Stone.png`,
  'Money': `${IMG}/Coin_Currency.png`,
};

const auraImage: Record<string, string> = {
  'Cherry Blossom': `${IMG}/CherryBlossomAura.png`,
  'Decidious': `${IMG}/DecidiousAura.png`,
};

const currencyIcon: Record<string, string> = {
  T: `${IMG}/Currency_Tera.png`,
  M: `${IMG}/Currency_Mega.png`,
  B: `${IMG}/Currency_Bit.png`,
};

function ItemImg({ name, size = 24 }: { name: string; size?: number }) {
  const src = itemIcon[name];
  if (!src) return null;
  return <img src={src} alt={name} width={size} height={size} className="inline-block align-middle" />;
}

function CurrencyImg({ unit, size = 16 }: { unit: string; size?: number }) {
  const src = currencyIcon[unit];
  if (!src) return <span>{unit}</span>;
  return <img src={src} alt={unit} width={size} height={size} className="inline-block align-middle" />;
}

function CurrencyAmount({ value }: { value: string }) {
  if (value === '0' || value === 'Free' || value === '-') {
    return <span className="text-muted-foreground">—</span>;
  }
  const parts = value.match(/(\d[\d,]*)\s*([TMB])/g);
  if (!parts) return <span>{value}</span>;
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {parts.map((part, i) => {
        const m = part.match(/^([\d,]+)\s*([TMB])$/);
        if (!m) return <span key={i}>{part}</span>;
        return (
          <span key={i} className="inline-flex items-center gap-0.5">
            <span>{m[1]}</span>
            <CurrencyImg unit={m[2]} />
          </span>
        );
      })}
    </span>
  );
}

function parseMaterial(m: string): { name: string; qty: string } {
  const match = m.match(/^(.+?)\s+(x\d+)$/);
  if (match) return { name: match[1], qty: match[2] };
  return { name: m, qty: '' };
}

function MaterialLine({ text }: { text: string }) {
  const { name, qty } = parseMaterial(text);
  return (
    <li className="flex items-center gap-1.5 text-muted-foreground">
      <ItemImg name={name} size={20} />
      <span>{name}</span>
      {qty && <span className="text-foreground/70 font-medium">{qty}</span>}
    </li>
  );
}

/* ─── Data ─────────────────────────────────────────────────────────────── */

const loaderTypes = ['Cherry Blossom', 'Decidious'];

interface CraftStep {
  product: string;
  materials: string[];
  cost: string;
  rate: string;
}

const craftingSteps: CraftStep[] = [
  {
    product: 'Digimon Xros Loader Lv 0',
    materials: ['Digicode x1'],
    cost: '-',
    rate: '100%',
  },
  {
    product: 'Digimon Xros Loader Lv 1',
    materials: ['Digimon Xros Loader Lv 0', 'Digicode Piece x12'],
    cost: '30T 000M 000B',
    rate: '100%',
  },
  {
    product: 'Digimon Xros Loader Lv 2',
    materials: ['Digimon Xros Loader Lv 1', 'Digicode Piece x13'],
    cost: '33T 000M 000B',
    rate: '100%',
  },
  {
    product: 'Digimon Xros Loader Lv 3',
    materials: ['Digimon Xros Loader Lv 2', 'Digicode Piece x15'],
    cost: '36T 300M 000B',
    rate: '100%',
  },
  {
    product: 'Digimon Xros Loader Lv 4',
    materials: ['Digimon Xros Loader Lv 3', 'Digicode Piece x16'],
    cost: '39T 930M 000B',
    rate: '100%',
  },
  {
    product: 'Digimon Xros Loader Lv 5',
    materials: ['Digimon Xros Loader Lv 4', 'Digicode Piece x22'],
    cost: '47T 916M 200B',
    rate: '100%',
  },
  {
    product: 'Digimon Xros Loader Lv 6',
    materials: ['Digimon Xros Loader Lv 5', 'Digicode Piece x25'],
    cost: '57T 499M 200B',
    rate: '100%',
  },
  {
    product: 'Digimon Xros Loader Lv 7',
    materials: ['Digimon Xros Loader Lv 6', 'Digicode Piece x27'],
    cost: '68T 999M 040B',
    rate: '100%',
  },
  {
    product: 'Digimon Xros Loader Lv 8',
    materials: ['Digimon Xros Loader Lv 7', 'Digicode Piece x41'],
    cost: '89T 698M 752B',
    rate: '100%',
  },
  {
    product: 'Digimon Xros Loader Lv 9',
    materials: ['Digimon Xros Loader Lv 8', 'Digicode Piece x45'],
    cost: '116T 608M 752B',
    rate: '100%',
  },
  {
    product: 'Digimon Xros Loader Lv 10',
    materials: ['Digimon Xros Loader Lv 9', 'Digicode Piece x49'],
    cost: '151T 590M 690B',
    rate: '100%',
  },
  {
    product: 'Cherry Blossom-Xros Loader',
    materials: ['Digimon Xros Loader Lv 10', 'Digicode Piece x98'],
    cost: '227T 386M 336B',
    rate: '100%',
  },
];

interface TotalItem {
  item: string;
  amount: string;
}

const totalItems: TotalItem[] = [
  { item: 'Digicode Piece', amount: '363' },
  { item: 'Money', amount: '898T 928M 970B' },
];

/* ─── Table Components ─────────────────────────────────────────────────── */

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/50 first:rounded-tl-md last:rounded-tr-md">
      {children}
    </th>
  );
}

function TableCell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 text-sm border-t border-border/50 ${className}`}>
      {children}
    </td>
  );
}

/* ─── Section Component ────────────────────────────────────────────────── */

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-2xl font-bold mb-4 text-foreground">{title}</h2>
      {children}
    </section>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */

export default function XrosLoaderPage() {
  return (
    <div className="container py-8 max-w-5xl">
      {/* Breadcrumb */}
      <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Guides
      </Link>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">Xros Loader</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary">Equipment</Badge>
          <Badge variant="secondary">Crafting</Badge>
          <Badge variant="secondary">Shinjuku (D-Reaper)</Badge>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          The <strong className="text-foreground">Xros Loader</strong> and <strong className="text-foreground">Fusion Loader</strong> represent 2 types of Digivice inspired by the <strong className="text-foreground">Digimon Xros Wars / Digimon Fusion</strong> Anime.
          Each type adds a unique visual aura effect to your tamer.
        </p>
      </div>

      {/* Quick Info */}
      <Card className="mb-8 border-primary/20">
        <CardContent className="pt-6">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary font-bold">&#8226;</span>
              Crafted at the <strong className="text-foreground">Patamon (Craft Item)</strong> NPC in <strong className="text-foreground">D-Terminal</strong>.
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">&#8226;</span>
              Materials drop from the <strong className="text-foreground">Susanoomon</strong> raid boss in the <strong className="text-foreground">Destruction and Regeneration</strong> Dungeon.
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">&#8226;</span>
              The <strong className="text-foreground">Digicode</strong> item needed to start crafting is obtained from the quest <strong className="text-foreground">&quot;God of Destruction and Regeneration&quot;</strong> (kill Susanoomon in the Dungeon 10 times).
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Table of Contents */}
      <Card className="mb-10">
        <CardHeader>
          <CardTitle className="text-lg">Contents</CardTitle>
        </CardHeader>
        <CardContent>
          <nav className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {[
              { href: '#attributes', label: 'Digivice Attributes' },
              { href: '#auras', label: 'Aura Types' },
              { href: '#items', label: 'Item Preview' },
              { href: '#crafting', label: 'Crafting Xros Loader / Fusion Loader' },
              { href: '#totals', label: 'Total Items Required' },
            ].map(item => (
              <a key={item.href} href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded hover:bg-secondary/50">
                {item.label}
              </a>
            ))}
          </nav>
        </CardContent>
      </Card>

      <div className="space-y-12">
        {/* Digivice Attributes */}
        <Section id="attributes" title="Digivice Attributes">
          <Card>
            <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                Both versions of the Loader come with <strong className="text-foreground">2 options</strong>.
                They work similarly to Rings, Necklaces, Earrings, and Bracelets &mdash; options can be changed with
                {' '}<ItemImg name="Option Change Stone" size={20} /> <strong className="text-foreground">Option Change Stone</strong> and
                {' '}<ItemImg name="Number Change Stone" size={20} /> <strong className="text-foreground">Number Change Stone</strong>,
                and upgraded to 200% with <strong className="text-foreground">Digitary Power Stone</strong>.
              </p>
              <p>
                Options can be any combination of <strong className="text-foreground">Digimon Attributes</strong> and <strong className="text-foreground">Digimon Elements</strong>.
                You cannot get the same option twice.
              </p>
              <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                <p className="flex gap-2 items-start">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>
                    Unlike the Basic Attribute option in accessories, Digivice Attributes are <strong className="text-foreground">NOT</strong> damage bonuses from attribute advantage.
                    Instead, they <strong className="text-foreground">increase the skill damage</strong> of all Digimon of that attribute, regardless of enemy matchup.
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-secondary/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary">15%</div>
                  <div className="text-xs text-muted-foreground mt-1">Max Digimon Attribute</div>
                </div>
                <div className="bg-secondary/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary">20%</div>
                  <div className="text-xs text-muted-foreground mt-1">Max Digimon Element</div>
                </div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                <p className="flex gap-2 items-start text-green-400">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    The maximum stats are <strong>higher than OT, D-Ark, TV etc.</strong> With both Loaders you can equip a total of <strong>6 Chipsets</strong> (2 more than OT, D-Ark, TV etc.).
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* Aura Types */}
        <Section id="auras" title="Aura Types">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loaderTypes.map(type => (
              <Card key={type} className="text-center overflow-hidden">
                <CardContent className="pt-4 pb-3 px-3">
                  <div className="relative w-full aspect-square max-w-[250px] mx-auto mb-3">
                    <img
                      src={auraImage[type]}
                      alt={`${type}-Xros Loader aura`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <ItemImg name={`${type}-Xros Loader`} size={20} />
                    <span className="text-sm font-bold text-primary">{type}-Xros Loader</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        <Separator />

        {/* Item Preview */}
        <Section id="items" title="Item Preview">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <TableHeader>Icon</TableHeader>
                  <TableHeader>Item</TableHeader>
                </tr>
              </thead>
              <tbody>
                {['Cherry Blossom-Xros Loader', 'Decidious-Xros Loader'].map((item, i) => (
                  <tr key={i} className="hover:bg-secondary/20 transition-colors">
                    <TableCell>
                      <ItemImg name={item} size={40} />
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">{item}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Separator />

        {/* Crafting */}
        <Section id="crafting" title="Crafting Xros Loader / Fusion Loader">
          <p className="text-sm text-muted-foreground mb-4">
            Complete <strong className="text-foreground">Richard Sampson&apos;s</strong> sub quest <strong className="text-foreground">[New Digivice, D-Ark]</strong> and the quest <strong className="text-foreground">&quot;God of Destruction and Regeneration&quot;</strong> to obtain the <strong className="text-foreground">Digicode</strong>.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <TableHeader>Production Item</TableHeader>
                  <TableHeader>Materials</TableHeader>
                  <TableHeader>Cost</TableHeader>
                  <TableHeader>Rate</TableHeader>
                </tr>
              </thead>
              <tbody>
                {craftingSteps.map((step, i) => (
                  <tr key={i} className={`hover:bg-secondary/20 transition-colors ${i === craftingSteps.length - 1 ? 'bg-primary/5' : ''}`}>
                    <TableCell className="font-semibold text-foreground whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <ItemImg name={step.product} size={28} />
                        {step.product}
                      </span>
                      {i === craftingSteps.length - 1 && (
                        <div className="text-xs text-muted-foreground mt-1 ml-10">
                          or <ItemImg name="Decidious-Xros Loader" size={16} /> Decidious-Xros Loader
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <ul className="space-y-1">
                        {step.materials.map((m, j) => (
                          <MaterialLine key={j} text={m} />
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-primary"><CurrencyAmount value={step.cost} /></TableCell>
                    <TableCell className="text-green-400">{step.rate}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Separator />

        {/* Total Items Required */}
        <Section id="totals" title="Total Items Required">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <TableHeader>Item</TableHeader>
                  <TableHeader>Amount</TableHeader>
                </tr>
              </thead>
              <tbody>
                {totalItems.map((item, i) => (
                  <tr key={i} className={`hover:bg-secondary/20 transition-colors ${item.item === 'Money' ? 'bg-primary/5' : ''}`}>
                    <TableCell className={`font-semibold ${item.item === 'Money' ? 'text-primary' : 'text-foreground'}`}>
                      <span className="flex items-center gap-2">
                        <ItemImg name={item.item} size={24} />
                        {item.item}
                      </span>
                    </TableCell>
                    <TableCell className={`font-medium ${item.item === 'Money' ? 'text-primary' : 'text-muted-foreground'}`}>
                      {item.item === 'Money' ? <CurrencyAmount value={item.amount} /> : item.amount}
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}
