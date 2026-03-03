import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'D-Ark Limited Edition Guide - DMO KB',
  description: 'Complete crafting guide for all 5 D-Ark Limited Edition types in Digimon Masters Online. Materials, locations, costs, and crafting steps.',
};

/* ─── Image Paths ──────────────────────────────────────────────────────── */

const IMG = '/images/guides/d-ark-limited-edition';

const itemIcon: Record<string, string> = {
  'D-Ark Prototype Lv. 1': `${IMG}/D-Ark_Prototype_Lv1.png`,
  'D-Ark Proto Type Lv. 2': `${IMG}/D-Ark_Proto_Type_Lv2.png`,
  'D-Ark Proto Type Lv. 3': `${IMG}/D-Ark_Proto_Type_Lv3.png`,
  'D-Ark Complete Type Lv. 1': `${IMG}/D-Ark_Complete_Type_Lv1.png`,
  'D-Ark Complete Type Lv. 2': `${IMG}/D-Ark_Complete_Type_Lv2.png`,
  'D-Ark Complete Type Lv. 3': `${IMG}/D-Ark_Complete_Type_Lv3.png`,
  'D-Ark Limited Edition': `${IMG}/D-Ark_Limited_Edition.png`,
  'Enhanced Memory Card': `${IMG}/Enhanced_Memory_Card.png`,
  "D-Reaper's Data": `${IMG}/D-Reapers_Data.png`,
  "D-Reaper's True Data": `${IMG}/D-Reapers_True_Data.png`,
  "D-Reaper's Enriched Data": `${IMG}/D-Reapers_Enriched_Data.png`,
  'Matrix Energy': `${IMG}/Matrix_Energy.png`,
  'Safe Energy': `${IMG}/Safe_Energy.png`,
  'D-Ark: SAINT': `${IMG}/D-Ark_SAINT.png`,
  'D-Ark: SAKUYA': `${IMG}/D-Ark_SAKUYA.png`,
  'D-Ark: HAZARD': `${IMG}/D-Ark_HAZARD.png`,
  'D-Ark: DESTINY': `${IMG}/D-Ark_DESTINY.png`,
  'D-Ark: JUSTICE': `${IMG}/D-Ark_JUSTICE.png`,
  'Money': `${IMG}/Coin_Currency.png`,
};

const auraImage: Record<string, string> = {
  'SAINT': `${IMG}/D-Ark_SAINT_aura.png`,
  'SAKUYA': `${IMG}/D-Ark_SAKUYA_aura.png`,
  'HAZARD': `${IMG}/D-Ark_HAZARD_aura.png`,
  'DESTINY': `${IMG}/D-Ark_DESTINY_aura.png`,
  'JUSTICE': `${IMG}/D-Ark_JUSTICE_aura.png`,
};

function ItemImg({ name, size = 24 }: { name: string; size?: number }) {
  const src = itemIcon[name];
  if (!src) return null;
  return <img src={src} alt={name} width={size} height={size} className="inline-block align-middle" />;
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

const dArkTypes = ['SAINT', 'SAKUYA', 'HAZARD', 'DESTINY', 'JUSTICE'];

interface CraftStep {
  product: string;
  materials: string[];
  cost: string;
  rate: string;
}

const craftingSteps: CraftStep[] = [
  {
    product: 'D-Ark Proto Type Lv. 2',
    materials: ['D-Ark Prototype Lv. 1', 'Enhanced Memory Card x60', "D-Reaper's Data x70", "D-Reaper's True Data x10"],
    cost: '0',
    rate: '100%',
  },
  {
    product: 'D-Ark Proto Type Lv. 3',
    materials: ['D-Ark Proto Type Lv. 2', 'Enhanced Memory Card x60', "D-Reaper's Data x350", "D-Reaper's True Data x20", "D-Reaper's Enriched Data x4"],
    cost: '0',
    rate: '100%',
  },
  {
    product: 'D-Ark Complete Type Lv. 1',
    materials: ['D-Ark Proto Type Lv. 3', 'Enhanced Memory Card x90', "D-Reaper's Data x350", "D-Reaper's True Data x50", "D-Reaper's Enriched Data x10"],
    cost: '0',
    rate: '100%',
  },
  {
    product: 'D-Ark Complete Type Lv. 2',
    materials: ['D-Ark Complete Type Lv. 1', 'Enhanced Memory Card x150', "D-Reaper's Data x2000", "D-Reaper's True Data x200", "D-Reaper's Enriched Data x20", 'Matrix Energy x20'],
    cost: '0',
    rate: '100%',
  },
  {
    product: 'D-Ark Complete Type Lv. 3',
    materials: ['D-Ark Complete Type Lv. 2', 'Enhanced Memory Card x150', "D-Reaper's Data x2000", "D-Reaper's True Data x200", "D-Reaper's Enriched Data x30", 'Matrix Energy x40'],
    cost: '0',
    rate: '100%',
  },
  {
    product: 'D-Ark Limited Edition',
    materials: ['D-Ark Complete Type Lv. 3', 'Enhanced Memory Card x150', "D-Reaper's Data x2000", "D-Reaper's True Data x200", "D-Reaper's Enriched Data x40", 'Matrix Energy x60', 'Safe Energy x6'],
    cost: '0',
    rate: '100%',
  },
];

interface MaterialLocation {
  material: string;
  obtainment: string;
  location: string;
  chance: string;
}

const materialLocations: MaterialLocation[] = [
  { material: 'Enhanced Memory Card', obtainment: 'Daily Quest Reward', location: 'Shinjuku (D-Reaper) area', chance: '100%' },
  { material: "D-Reaper's Data", obtainment: 'D-Reaper ADR-06, ADR-07, ADR-08', location: 'West / East Shinjuku (D-Reaper)', chance: '100%' },
  { material: "D-Reaper's True Data", obtainment: 'D-Reaper ADR-06, ADR-07', location: 'West / East Shinjuku (D-Reaper)', chance: '10%' },
  { material: "D-Reaper's Enriched Data", obtainment: 'D-Reaper ADR-08', location: 'West / East Shinjuku (D-Reaper)', chance: '20%' },
  { material: 'Matrix Energy', obtainment: 'Dungeon Clear', location: 'Shinjuku Station (DG) / Shinjuku Park (D-Reaper) (DG)', chance: '100%' },
  { material: 'Safe Energy', obtainment: 'Dungeon Clear', location: 'D-Reaper Area (DG)', chance: '100%' },
];

interface TotalItem {
  item: string;
  amount: string;
}

const totalItems: TotalItem[] = [
  { item: 'Enhanced Memory Card', amount: '660' },
  { item: "D-Reaper's Data", amount: '6,770' },
  { item: "D-Reaper's True Data", amount: '680' },
  { item: "D-Reaper's Enriched Data", amount: '104' },
  { item: 'Matrix Energy', amount: '120' },
  { item: 'Safe Energy', amount: '6' },
  { item: 'Money', amount: '0' },
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

export default function DArkLimitedEditionPage() {
  return (
    <div className="container py-8 max-w-5xl">
      {/* Breadcrumb */}
      <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Guides
      </Link>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">D-Ark Limited Edition</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary">Equipment</Badge>
          <Badge variant="secondary">Crafting</Badge>
          <Badge variant="secondary">Shinjuku (D-Reaper)</Badge>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          The <strong className="text-foreground">D-Ark Limited Edition</strong> represents 5 types of Digivice inspired by the <strong className="text-foreground">Digimon Tamers</strong> Anime.
          Each type adds a unique visual aura effect to your tamer.
        </p>
      </div>

      {/* Quick Info */}
      <Card className="mb-8 border-primary/20">
        <CardContent className="pt-6">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary font-bold">&#8226;</span>
              Crafted at the <strong className="text-foreground">PawnChessmon B (DAT Member-Reward)</strong> NPC in <strong className="text-foreground">D-Terminal</strong>.
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">&#8226;</span>
              Materials drop from raid bosses in the <strong className="text-foreground">Shinjuku (D-Reaper)</strong> area.
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">&#8226;</span>
              Base version <strong className="text-foreground">D-Ark Prototype Lv. 1</strong> is obtained through a sub quest from <strong className="text-foreground">Richard Sampson</strong> at <strong className="text-foreground">DATS</strong> after completing all Main Quests in the Shinjuku (D-Reaper) area.
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
              { href: '#crafting', label: 'Crafting D-Ark Limited Edition' },
              { href: '#locations', label: 'Material Locations' },
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
                All versions of D-Ark Limited Edition come with <strong className="text-foreground">2 options</strong>.
                They work similarly to Rings, Necklaces, Earrings, and Bracelets &mdash; options can be changed with
                <strong className="text-foreground"> Option Change Stone</strong> and
                <strong className="text-foreground"> Number Change Stone</strong>,
                upgraded to 200% with <strong className="text-foreground">Digitary Power Stone</strong>,
                and renewed with <strong className="text-foreground">Renewal Increase Stone</strong>.
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
                  <div className="text-2xl font-bold text-primary">10%</div>
                  <div className="text-xs text-muted-foreground mt-1">Max Digimon Attribute</div>
                </div>
                <div className="bg-secondary/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary">15%</div>
                  <div className="text-xs text-muted-foreground mt-1">Max Digimon Element</div>
                </div>
              </div>
              <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                <p className="flex gap-2 items-start">
                  <Info className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                  <span>
                    The <strong className="text-foreground">D-Ark Prototype Lv. 3</strong>&apos;s stats are <strong className="text-yellow-400">7% Digimon Attribute</strong> and <strong className="text-yellow-400">10% Digimon Element</strong> at 100% Digitary Power.
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* Aura Types */}
        <Section id="auras" title="Aura Types">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {dArkTypes.map(type => (
              <Card key={type} className="text-center overflow-hidden">
                <CardContent className="pt-4 pb-3 px-3">
                  <div className="relative w-full aspect-square max-w-[200px] mx-auto mb-3">
                    <img
                      src={auraImage[type]}
                      alt={`D-Ark: ${type} aura`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <ItemImg name={`D-Ark: ${type}`} size={20} />
                    <span className="text-sm font-bold text-primary">D-Ark: {type}</span>
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
                {dArkTypes.map((type, i) => (
                  <tr key={i} className="hover:bg-secondary/20 transition-colors">
                    <TableCell>
                      <ItemImg name={`D-Ark: ${type}`} size={40} />
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">D-Ark: {type}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Separator />

        {/* Crafting D-Ark Limited Edition */}
        <Section id="crafting" title="Crafting D-Ark Limited Edition">
          <p className="text-sm text-muted-foreground mb-4">
            Complete <strong className="text-foreground">Richard Sampson&apos;s</strong> sub quest <strong className="text-foreground">[New Digivice, D-Ark]</strong> to obtain the <strong className="text-foreground">D-Ark Prototype Lv. 1</strong>.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <TableHeader>Production Item</TableHeader>
                  <TableHeader>Materials</TableHeader>
                  <TableHeader>Rate</TableHeader>
                </tr>
              </thead>
              <tbody>
                {craftingSteps.map((step, i) => (
                  <tr key={i} className="hover:bg-secondary/20 transition-colors">
                    <TableCell className="font-semibold text-foreground whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <ItemImg name={step.product} size={28} />
                        {step.product}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ul className="space-y-1">
                        {step.materials.map((m, j) => (
                          <MaterialLine key={j} text={m} />
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="text-green-400">{step.rate}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Separator />

        {/* Material Locations */}
        <Section id="locations" title="Material Locations">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <TableHeader>Material</TableHeader>
                  <TableHeader>Obtainment</TableHeader>
                  <TableHeader>Location</TableHeader>
                  <TableHeader>Chance</TableHeader>
                </tr>
              </thead>
              <tbody>
                {materialLocations.map((loc, i) => (
                  <tr key={i} className="hover:bg-secondary/20 transition-colors">
                    <TableCell className="font-semibold text-foreground whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <ItemImg name={loc.material} size={24} />
                        {loc.material}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{loc.obtainment}</TableCell>
                    <TableCell className="text-muted-foreground">{loc.location}</TableCell>
                    <TableCell className={`font-medium ${loc.chance === '100%' ? 'text-green-400' : loc.chance === '10%' ? 'text-red-400' : 'text-yellow-400'}`}>{loc.chance}</TableCell>
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
                    <TableCell className={`font-medium ${item.item === 'Money' ? 'text-primary' : 'text-muted-foreground'}`}>{item.amount}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      {/* Source */}
      <div className="mt-12 pt-6 border-t border-border/50 text-xs text-muted-foreground/50">
        Source:{' '}
        <a href="https://dmowiki.com/Guide:_D-Ark_Limited_Edition" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
          dmowiki.com/Guide:_D-Ark_Limited_Edition
        </a>
      </div>
    </div>
  );
}
