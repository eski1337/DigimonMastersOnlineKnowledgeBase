import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Info, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Adventure Goggles Guide - DMO KB',
  description: 'Complete guide for Adventure Goggles in Digimon Masters Online. Crafting, upgrading, rerolling, and all goggles status tables.',
};

/* ─── Image Paths ──────────────────────────────────────────────────────── */

const IMG = '/images/guides/adventure-goggles';

const itemIcon: Record<string, string> = {
  'Adventure Goggles': `${IMG}/Adventure_goggles1.png`,
  'Adventure Goggles Box': `${IMG}/Adventure_goggles_box.png`,
  'Goggles Lv1-4': `${IMG}/Adventure_goggles2.png`,
  'Goggles Lv5-8': `${IMG}/Adventure_goggles3.png`,
  'Goggles Lv9+': `${IMG}/Adventure_goggles4.png`,
  'Contaminated X-Antibody - CORE': `${IMG}/Contaminated_X-Antibody_-_CORE.png`,
  'Money': `${IMG}/Coin_Currency.png`,
};

function gogglesIcon(level: string): string {
  if (level === 'Adventure Goggles') return itemIcon['Adventure Goggles'];
  if (level.includes('Box')) return itemIcon['Adventure Goggles Box'];
  const m = level.match(/Lv(\d+)/);
  if (!m) return itemIcon['Adventure Goggles'];
  const lv = parseInt(m[1]);
  if (lv <= 4) return itemIcon['Goggles Lv1-4'];
  if (lv <= 8) return itemIcon['Goggles Lv5-8'];
  return itemIcon['Goggles Lv9+'];
}

const currencyIcon: Record<string, string> = {
  T: `${IMG}/Currency_Tera.png`,
  M: `${IMG}/Currency_Mega.png`,
  B: `${IMG}/Currency_Bit.png`,
};

function CurrencyImg({ unit, size = 16 }: { unit: string; size?: number }) {
  const src = currencyIcon[unit];
  if (!src) return <span>{unit}</span>;
  return <img src={src} alt={unit} width={size} height={size} className="inline-block align-middle" />;
}

function CurrencyAmount({ value }: { value: string }) {
  if (value === '0' || value === 'Free' || value === '-') {
    return <span className="text-muted-foreground">&mdash;</span>;
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

function GogglesImg({ name, size = 24 }: { name: string; size?: number }) {
  const src = gogglesIcon(name);
  return <img src={src} alt={name} width={size} height={size} className="inline-block align-middle" />;
}

function CoreImg({ size = 20 }: { size?: number }) {
  return <img src={itemIcon['Contaminated X-Antibody - CORE']} alt="Contaminated X-Antibody - CORE" width={size} height={size} className="inline-block align-middle" />;
}

/* ─── Data ─────────────────────────────────────────────────────────────── */

interface CraftStep {
  product: string;
  coreAmount: number;
  cost: string;
}

const craftingSteps: CraftStep[] = [
  { product: 'Adventure Goggles', coreAmount: 30, cost: '10T 000M 000B' },
  { product: 'Adventure Goggles Box', coreAmount: 3, cost: '6T 000M 000B' },
  { product: 'Adventure Goggles Lv1', coreAmount: 3, cost: '6T 600M 000B' },
  { product: 'Adventure Goggles Lv2', coreAmount: 3, cost: '7T 260M 000B' },
  { product: 'Adventure Goggles Lv3', coreAmount: 3, cost: '7T 990M 000B' },
  { product: 'Adventure Goggles Lv4', coreAmount: 3, cost: '8T 780M 000B' },
  { product: 'Adventure Goggles Lv5', coreAmount: 5, cost: '10T 540M 000B' },
  { product: 'Adventure Goggles Lv6', coreAmount: 5, cost: '12T 650M 000B' },
  { product: 'Adventure Goggles Lv7', coreAmount: 5, cost: '15T 180M 000B' },
  { product: 'Adventure Goggles Lv8', coreAmount: 9, cost: '18T 220M 000B' },
  { product: 'Adventure Goggles Lv9', coreAmount: 9, cost: '21T 860M 000B' },
  { product: 'Adventure Goggles Lv10', coreAmount: 9, cost: '28T 420M 000B' },
  { product: 'Adventure Goggles Lv11', coreAmount: 9, cost: '36T 940M 000B' },
  { product: 'Adventure Goggles Lv12', coreAmount: 10, cost: '48T 020M 000B' },
  { product: 'Adventure Goggles Lv13', coreAmount: 10, cost: '62T 430M 000B' },
  { product: 'Adventure Goggles Lv14', coreAmount: 10, cost: '81T 160M 000B' },
  { product: 'Adventure Goggles Lv15', coreAmount: 20, cost: '121T 740M 000B' },
];

interface GogglesStatus {
  level: string;
  skillDmg: string;
  stat: number;
}

const htGoggles: GogglesStatus[] = [
  { level: 'Box', skillDmg: '-', stat: 35 },
  { level: 'Lv1', skillDmg: '1%', stat: 75 },
  { level: 'Lv2', skillDmg: '2%', stat: 125 },
  { level: 'Lv3', skillDmg: '3%', stat: 200 },
  { level: 'Lv4', skillDmg: '3%', stat: 250 },
  { level: 'Lv5', skillDmg: '3%', stat: 300 },
  { level: 'Lv6', skillDmg: '4%', stat: 375 },
  { level: 'Lv7', skillDmg: '4%', stat: 450 },
  { level: 'Lv8', skillDmg: '4%', stat: 525 },
  { level: 'Lv9', skillDmg: '5%', stat: 600 },
  { level: 'Lv10', skillDmg: '5%', stat: 675 },
  { level: 'Lv11', skillDmg: '5%', stat: 750 },
  { level: 'Lv12', skillDmg: '6%', stat: 840 },
  { level: 'Lv13', skillDmg: '6%', stat: 910 },
  { level: 'Lv14', skillDmg: '6%', stat: 980 },
  { level: 'Lv15', skillDmg: '7%', stat: 1050 },
];

const atGoggles: GogglesStatus[] = [
  { level: 'Box', skillDmg: '-', stat: 575 },
  { level: 'Lv1', skillDmg: '1%', stat: 660 },
  { level: 'Lv2', skillDmg: '2%', stat: 715 },
  { level: 'Lv3', skillDmg: '3%', stat: 770 },
  { level: 'Lv4', skillDmg: '3%', stat: 825 },
  { level: 'Lv5', skillDmg: '3%', stat: 880 },
  { level: 'Lv6', skillDmg: '4%', stat: 935 },
  { level: 'Lv7', skillDmg: '4%', stat: 990 },
  { level: 'Lv8', skillDmg: '4%', stat: 1045 },
  { level: 'Lv9', skillDmg: '5%', stat: 1100 },
  { level: 'Lv10', skillDmg: '5%', stat: 1155 },
  { level: 'Lv11', skillDmg: '5%', stat: 1210 },
  { level: 'Lv12', skillDmg: '6%', stat: 1320 },
  { level: 'Lv13', skillDmg: '6%', stat: 1430 },
  { level: 'Lv14', skillDmg: '6%', stat: 1595 },
  { level: 'Lv15', skillDmg: '7%', stat: 1760 },
];

const ctGoggles: GogglesStatus[] = [
  { level: 'Box', skillDmg: '-', stat: 725 },
  { level: 'Lv1', skillDmg: '1%', stat: 800 },
  { level: 'Lv2', skillDmg: '2%', stat: 875 },
  { level: 'Lv3', skillDmg: '3%', stat: 950 },
  { level: 'Lv4', skillDmg: '3%', stat: 1025 },
  { level: 'Lv5', skillDmg: '3%', stat: 1100 },
  { level: 'Lv6', skillDmg: '4%', stat: 1175 },
  { level: 'Lv7', skillDmg: '4%', stat: 1250 },
  { level: 'Lv8', skillDmg: '4%', stat: 1325 },
  { level: 'Lv9', skillDmg: '5%', stat: 1400 },
  { level: 'Lv10', skillDmg: '5%', stat: 1500 },
  { level: 'Lv11', skillDmg: '5%', stat: 1600 },
  { level: 'Lv12', skillDmg: '6%', stat: 1700 },
  { level: 'Lv13', skillDmg: '6%', stat: 1800 },
  { level: 'Lv14', skillDmg: '6%', stat: 1900 },
  { level: 'Lv15', skillDmg: '7%', stat: 2000 },
];

/* ─── Table Components ─────────────────────────────────────────────────── */

function TableHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/50 first:rounded-tl-md last:rounded-tr-md ${className}`}>
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

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-2xl font-bold mb-4 text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function StatusTable({ data, statName, color }: { data: GogglesStatus[]; statName: string; color: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <TableHeader>Level</TableHeader>
            <TableHeader>Skill Damage</TableHeader>
            <TableHeader>{statName} Increase</TableHeader>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={`hover:bg-secondary/20 transition-colors ${i === data.length - 1 ? 'bg-primary/5' : ''}`}>
              <TableCell className="font-semibold text-foreground whitespace-nowrap">
                <span className="flex items-center gap-2">
                  <GogglesImg name={row.level === 'Box' ? 'Adventure Goggles Box' : `Adventure Goggles ${row.level}`} size={28} />
                  {row.level === 'Box' ? 'Goggles Box' : row.level}
                </span>
              </TableCell>
              <TableCell className={row.skillDmg === '-' ? 'text-muted-foreground' : `font-bold ${color}`}>
                {row.skillDmg === '-' ? '—' : row.skillDmg}
              </TableCell>
              <TableCell className={`font-bold ${color}`}>
                {row.stat.toLocaleString()}
              </TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */

export default function AdventureGogglesPage() {
  return (
    <div className="container py-8 max-w-5xl">
      {/* Breadcrumb */}
      <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Guides
      </Link>

      {/* Title + Tamer Slot Image */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-3">Adventure Goggles</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary">Equipment</Badge>
              <Badge variant="secondary">Crafting</Badge>
              <Badge variant="secondary">Royal Base (Hard)</Badge>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">Adventure Goggles</strong> are a special accessory introduced with <strong className="text-foreground">Royal Base Hard</strong>.
              They occupy an exclusive equipment slot and provide <strong className="text-foreground">skill damage</strong> and specific <strong className="text-foreground">random stats</strong> to further strengthen your Digimon in combat.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Once crafted, goggles can be leveled up to improve their effectiveness and unlock additional bonuses.
              Upgrading requires resources and time, but the investment is worth it for the significant advantages they bring.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Card className="overflow-hidden border-primary/20">
              <CardContent className="p-0">
                <img
                  src={`${IMG}/Tamer_goggles_slot.png`}
                  alt="Goggle's Tamer Slot"
                  className="w-full max-w-[300px] h-auto"
                />
              </CardContent>
              <div className="text-center py-2 text-xs text-muted-foreground bg-secondary/30">Goggle&apos;s Tamer Slot</div>
            </Card>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <Card className="mb-8 border-primary/20">
        <CardContent className="pt-6">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary font-bold">&#8226;</span>
              Crafted at <strong className="text-foreground">Dorumon (Goggles Make)</strong> NPC, located near V-mon and Digitamamon.
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">&#8226;</span>
              Materials obtained through drops from <strong className="text-foreground">Royal Base (Hard)</strong>.
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-red-400 font-bold">&#8226;</span>
              <span><strong className="text-red-400">Warning:</strong> There is a chance to <strong className="text-red-400">fail</strong> and <strong className="text-red-400">lose your money</strong> when upgrading, but the goggles keep at the same level.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">&#8226;</span>
              You can reroll until you get the status you are looking for.
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
              { href: '#crafting', label: 'Item Craft' },
              { href: '#rerolling', label: 'Rerolling' },
              { href: '#status-ht', label: 'HT/HT Goggles (Hit Rate)' },
              { href: '#status-at', label: 'AT/AT Goggles (Attack)' },
              { href: '#status-ct', label: 'CT/CT Goggles (Critical Hit)' },
            ].map(item => (
              <a key={item.href} href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded hover:bg-secondary/50">
                {item.label}
              </a>
            ))}
          </nav>
        </CardContent>
      </Card>

      <div className="space-y-12">
        {/* Item Craft */}
        <Section id="crafting" title="Item Craft">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <TableHeader>Production Item</TableHeader>
                  <TableHeader>Materials</TableHeader>
                  <TableHeader>Cost</TableHeader>
                </tr>
              </thead>
              <tbody>
                {craftingSteps.map((step, i) => (
                  <tr key={i} className={`hover:bg-secondary/20 transition-colors ${i === 0 ? 'bg-primary/5' : ''}`}>
                    <TableCell className="font-semibold text-foreground whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <GogglesImg name={step.product} size={28} />
                        {step.product}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <CoreImg />
                        <span>Contaminated X-Antibody - CORE</span>
                        <span className="text-foreground/70 font-medium">x{step.coreAmount}</span>
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-primary">
                      <CurrencyAmount value={step.cost} />
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Separator />

        {/* Rerolling */}
        <Section id="rerolling" title="Rerolling">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                By using the <strong className="text-foreground">Material Convert</strong> table, you can exchange your <strong className="text-foreground">level 0</strong> goggles for <strong className="text-foreground">27</strong> <CoreImg size={18} /> <strong className="text-foreground">Contaminated X-Antibody - CORE</strong>.
                This allows you to craft a new Adventure Goggles Box using <strong className="text-foreground">30</strong> <CoreImg size={18} /> <strong className="text-foreground">Contaminated X-Antibody - CORE</strong>.
              </p>
              <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                <p className="flex gap-2 items-start text-sm">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    Rerolling is a useful strategy if you want to try for better stats on your goggles.
                    You only lose <strong className="text-foreground">3 COREs</strong> per reroll attempt (30 to craft minus 27 returned).
                  </span>
                </p>
              </div>
              <div className="rounded-lg overflow-hidden border border-border/50 max-w-lg">
                <img
                  src={`${IMG}/Tamer_goggles_reroll.png`}
                  alt="Rerolling Goggles UI"
                  className="w-full h-auto"
                />
                <div className="text-center py-2 text-xs text-muted-foreground bg-secondary/30">Rerolling Goggles via Material Convert</div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* Goggles Status */}
        <section id="status" className="scroll-mt-20">
          <h2 className="text-2xl font-bold mb-2 text-foreground">Goggles Status</h2>
          <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/30 mb-6 flex gap-2 items-start text-sm">
            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              Only the most popular status combinations are listed below. Total Status shown is the <strong className="text-foreground">cumulative total</strong> at each level.
            </span>
          </div>

          <div className="space-y-10">
            {/* HT/HT */}
            <div id="status-ht" className="scroll-mt-20">
              <h3 className="text-xl font-bold mb-3 text-foreground flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                HT/HT Goggles
                <span className="text-sm font-normal text-muted-foreground">(Hit Rate)</span>
              </h3>
              <StatusTable data={htGoggles} statName="Hit Rate" color="text-blue-400" />
            </div>

            {/* AT/AT */}
            <div id="status-at" className="scroll-mt-20">
              <h3 className="text-xl font-bold mb-3 text-foreground flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400"></span>
                AT/AT Goggles
                <span className="text-sm font-normal text-muted-foreground">(Attack)</span>
              </h3>
              <StatusTable data={atGoggles} statName="Attack" color="text-red-400" />
            </div>

            {/* CT/CT */}
            <div id="status-ct" className="scroll-mt-20">
              <h3 className="text-xl font-bold mb-3 text-foreground flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                CT/CT Goggles
                <span className="text-sm font-normal text-muted-foreground">(Critical Hit)</span>
              </h3>
              <StatusTable data={ctGoggles} statName="Critical Hit" color="text-yellow-400" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
