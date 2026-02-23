import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'True Digivice Guide - DMO KB',
  description: 'Complete crafting guide for all 11 True Digivice types in Digimon Masters Online. Materials, locations, costs, and resetting guide.',
};

/* ─── Data ─────────────────────────────────────────────────────────────── */

const digiviceTypes = [
  'Courage', 'Friendship', 'Love', 'Purity', 'Knowledge',
  'Sincerity', 'Kindness', 'Hope', 'Light', 'Fate', 'Miracle',
];

interface CraftStep {
  product: string;
  materials: string[];
  cost: string;
  rate: string;
}

const craftingSteps: CraftStep[] = [
  {
    product: 'Digivice of Beginning Lv. 1',
    materials: ['Digivice of Beginning Lv. 0', 'Essence of Evolution x149', 'Fragment of Evolution x8'],
    cost: '200M',
    rate: '100%',
  },
  {
    product: 'Digivice of Beginning Lv. 2',
    materials: ['Digivice of Beginning Lv. 1', 'Essence of Evolution x211', 'Piece of Evolution x11', "Myotismon's Digicore x6"],
    cost: '600M',
    rate: '100%',
  },
  {
    product: 'Digivice of Adventure Lv. 0',
    materials: ['Digivice of Beginning Lv. 2', 'Essence of Evolution x287', 'Infective Virus x8', "Digimon's Bionic Energy x7", 'Digital Energy x7'],
    cost: '1,500M',
    rate: '100%',
  },
  {
    product: 'Digivice of Adventure Lv. 1',
    materials: ['Digivice of Adventure Lv. 0', 'Essence of Evolution x301', "SkullMeramon's Digicore x7", 'Absolute Essence of Evolution x5'],
    cost: '2,700M',
    rate: '100%',
  },
  {
    product: 'Digivice of Adventure Lv. 2',
    materials: ['Digivice of Adventure Lv. 1', 'Essence of Evolution x307', 'Soul of Myotismon x6', 'Heinous Digicore x3'],
    cost: '4,500M',
    rate: '100%',
  },
  {
    product: 'True Digivice',
    materials: ['Digivice of Adventure Lv. 2', 'Essence of Evolution x318', "VenomMyotismon's Venom x7", 'Condensed Dark Energy x4'],
    cost: '8T',
    rate: '100%',
  },
];

const digiviceMaterials: CraftStep[] = [
  {
    product: 'Absolute Essence of Evolution',
    materials: ['Fragment of Evolution x3', 'Piece of Evolution x3'],
    cost: '100M',
    rate: '100%',
  },
  {
    product: 'Heinous Digicore',
    materials: ["SkullMeramon's Digicore x1", "Myotismon's Digicore x3", 'Infective Virus x3'],
    cost: '300M',
    rate: '100%',
  },
  {
    product: 'Condensed Dark Energy',
    materials: ["Myotismon's Digicore x1", "SkullMeramon's Digicore x2", 'Soul of Myotismon x1'],
    cost: '700M',
    rate: '100%',
  },
];

interface MaterialLocation {
  material: string;
  raid: string[];
  location: string;
}

const materialLocations: MaterialLocation[] = [
  { material: 'Fragment of Evolution', raid: ['Aquilamon', 'Mammothmon'], location: 'Valley of Light' },
  { material: 'Piece of Evolution', raid: ['Raremon', 'Phantomon'], location: 'Shibuya' },
  { material: "Myotismon's Digicore", raid: ['Myotismon'], location: 'Shibuya / Minato City' },
  { material: 'Digital Energy', raid: ['Groundramon'], location: 'Odaiba' },
  { material: "Digimon's Bionic Energy", raid: ['Okuwamon'], location: 'Odaiba' },
  { material: 'Infective Virus', raid: ['Myotismon', 'DarkTyrannomon'], location: 'Big Sight' },
  { material: "SkullMeramon's Digicore", raid: ['SkullMeramon'], location: 'Tokyo Tower Observatory (DG)' },
  { material: 'Soul of Myotismon', raid: ['Myotismon'], location: 'Fuji TV Rooftop (DG)' },
  { material: "VenomMyotismon's Venom", raid: ['VenomMyotismon'], location: 'Venomous Vortex (DG)' },
  { material: 'Absolute Essence of Evolution', raid: ['MegaSeadramon'], location: 'Rainbow Bridge (DG)' },
];

interface TotalItem {
  item: string;
  amount: string;
}

const totalItems: TotalItem[] = [
  { item: 'Essence of Evolution', amount: '1,573' },
  { item: 'Fragment of Evolution', amount: '23' },
  { item: 'Piece of Evolution', amount: '26' },
  { item: "Myotismon's Digicore", amount: '19' },
  { item: 'Infective Virus', amount: '17' },
  { item: "Digimon's Bionic Energy", amount: '7' },
  { item: 'Digital Energy', amount: '7' },
  { item: "SkullMeramon's Digicore", amount: '18' },
  { item: 'Soul of Myotismon', amount: '10' },
  { item: "VenomMyotismon's Venom", amount: '7' },
  { item: 'Absolute Essence of Evolution', amount: '5' },
  { item: 'Heinous Digicore', amount: '3' },
  { item: 'Condensed Dark Energy', amount: '4' },
  { item: 'Money', amount: '21T 700M' },
];

interface ResetRecipe {
  source: string;
  materials: string[];
  cost: string;
}

const resetRecipes: ResetRecipe[] = [
  ...digiviceTypes.map(type => ({
    source: `Digivice of ${type}`,
    materials: [
      `Digivice of ${type}`,
      "VenomMyotismon's Venom x1",
      'Soul of Myotismon x2',
      "SkullMeramon's Digicore x4",
      'Essence of Evolution x710',
    ],
    cost: '4T',
  })),
  {
    source: '103-Orange-OT',
    materials: ['103-Orange-OT', 'Essence of Evolution x318', "VenomMyotismon's Venom x7", 'Condensed Dark Energy x4'],
    cost: '8T',
  },
  {
    source: '103-Purple-OT',
    materials: ['103-Purple-OT', 'Essence of Evolution x318', "VenomMyotismon's Venom x7", 'Condensed Dark Energy x4'],
    cost: '8T',
  },
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

export default function TrueDigivicePage() {
  return (
    <div className="container py-8 max-w-5xl">
      {/* Breadcrumb */}
      <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Guides
      </Link>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">True Digivice</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary">Equipment</Badge>
          <Badge variant="secondary">Crafting</Badge>
          <Badge variant="secondary">Tokyo-Odaiba</Badge>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          <strong className="text-foreground">True Digivice</strong> refers to the 11 types of Digivice corresponding to each crest from Digimon Adventure.
          Each type adds a unique visual aura effect to your tamer.
        </p>
      </div>

      {/* Quick Info */}
      <Card className="mb-8 border-primary/20">
        <CardContent className="pt-6">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary font-bold">&#8226;</span>
              Crafted via the <strong className="text-foreground">Nanomon (Item Craft)</strong> NPC at <strong className="text-foreground">Dats Center</strong>.
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">&#8226;</span>
              Materials drop from raid bosses in <strong className="text-foreground">Tokyo-Odaiba</strong> maps.
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">&#8226;</span>
              Base version <strong className="text-foreground">Digivice of Beginning Lv. 0</strong> is obtained from a main quest at <strong className="text-foreground">Minato City</strong>.
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">&#8226;</span>
              You can craft an additional True Digivice using the <strong className="text-foreground">103-OT Digivice</strong>.
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
              { href: '#crafting', label: 'Crafting True Digivice' },
              { href: '#materials', label: 'Digivice Material Recipes' },
              { href: '#locations', label: 'Material Locations' },
              { href: '#totals', label: 'Total Items Required' },
              { href: '#resetting', label: 'Resetting True Digivice' },
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
                All versions of True Digivice come with <strong className="text-foreground">2 options</strong>.
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
              <p className="text-xs text-muted-foreground/70">
                <strong className="text-foreground">Digivice of Adventure Lv. 2</strong> and all versions of <strong className="text-foreground">103-OT Digivice</strong> have the same stats as True Digivice, minus the tamer visual aura effect.
              </p>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* Aura Types */}
        <Section id="auras" title="Aura Types">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {digiviceTypes.map(type => (
              <Card key={type} className="text-center">
                <CardContent className="pt-4 pb-3 px-3">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg">
                    ✦
                  </div>
                  <div className="text-xs font-medium text-foreground">Digivice of</div>
                  <div className="text-sm font-bold text-primary">{type}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        <Separator />

        {/* Crafting True Digivice */}
        <Section id="crafting" title="Crafting True Digivice">
          <p className="text-sm text-muted-foreground mb-4">
            Complete the quest <strong className="text-foreground">[Wizardmon&apos;s Plan 1]</strong> via NPC Wizardmon in Minato City to obtain the <strong className="text-foreground">Digivice of Beginning Lv. 0</strong>.
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
                  <tr key={i} className="hover:bg-secondary/20 transition-colors">
                    <TableCell className="font-semibold text-foreground whitespace-nowrap">{step.product}</TableCell>
                    <TableCell>
                      <ul className="space-y-0.5">
                        {step.materials.map((m, j) => (
                          <li key={j} className="text-muted-foreground">{m}</li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-primary">{step.cost}</TableCell>
                    <TableCell className="text-green-400">{step.rate}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Separator />

        {/* Digivice Material Recipes */}
        <Section id="materials" title="Digivice Material Recipes">
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
                {digiviceMaterials.map((step, i) => (
                  <tr key={i} className="hover:bg-secondary/20 transition-colors">
                    <TableCell className="font-semibold text-foreground whitespace-nowrap">{step.product}</TableCell>
                    <TableCell>
                      <ul className="space-y-0.5">
                        {step.materials.map((m, j) => (
                          <li key={j} className="text-muted-foreground">{m}</li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-primary">{step.cost}</TableCell>
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
                  <TableHeader>Raid Boss</TableHeader>
                  <TableHeader>Location</TableHeader>
                </tr>
              </thead>
              <tbody>
                {materialLocations.map((loc, i) => (
                  <tr key={i} className="hover:bg-secondary/20 transition-colors">
                    <TableCell className="font-semibold text-foreground whitespace-nowrap">{loc.material}</TableCell>
                    <TableCell className="text-muted-foreground">{loc.raid.join(', ')}</TableCell>
                    <TableCell className="text-muted-foreground">{loc.location}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Separator />

        {/* Total Items Required */}
        <Section id="totals" title="Total Items / Money Required">
          <div className="bg-secondary/30 rounded-lg p-4 border border-border/50 mb-4 flex gap-2 items-start text-sm">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              The required items for crafting <strong className="text-foreground">Absolute Essence of Evolution</strong>,{' '}
              <strong className="text-foreground">Heinous Digicore</strong>, and{' '}
              <strong className="text-foreground">Condensed Dark Energy</strong> are already included in the totals below.
            </span>
          </div>
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
                    <TableCell className={`font-semibold ${item.item === 'Money' ? 'text-primary' : 'text-foreground'}`}>{item.item}</TableCell>
                    <TableCell className={`font-medium ${item.item === 'Money' ? 'text-primary' : 'text-muted-foreground'}`}>{item.amount}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Separator />

        {/* Resetting True Digivice */}
        <Section id="resetting" title="Resetting True Digivice">
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Since the version of True Digivice you receive is <strong className="text-foreground">random</strong>,
            the game allows you to re-craft from any version you have obtained.
            OT Digivices can also be changed into True Digivice using this method.
            All reset recipes have a <strong className="text-green-400">100% success rate</strong>.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <TableHeader>Source</TableHeader>
                  <TableHeader>Materials</TableHeader>
                  <TableHeader>Cost</TableHeader>
                </tr>
              </thead>
              <tbody>
                {resetRecipes.map((recipe, i) => (
                  <tr key={i} className="hover:bg-secondary/20 transition-colors">
                    <TableCell className="font-semibold text-foreground whitespace-nowrap">{recipe.source}</TableCell>
                    <TableCell>
                      <ul className="space-y-0.5">
                        {recipe.materials.slice(1).map((m, j) => (
                          <li key={j} className="text-muted-foreground">{m}</li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-primary">{recipe.cost}</TableCell>
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
        <a href="https://dmowiki.com/Guide:_True_Digivice" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
          dmowiki.com/Guide:_True_Digivice
        </a>
      </div>
    </div>
  );
}
