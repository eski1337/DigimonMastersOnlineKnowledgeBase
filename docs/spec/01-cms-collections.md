# Part 1 — CMS Collections

> DB is **MongoDB** (not PostgreSQL). Payload v2.26 + @payloadcms/db-mongodb.

## 1.1 `evolution-edges` Collection

```ts
// apps/cms/src/collections/EvolutionEdges.ts
import type { CollectionConfig, CollectionBeforeValidateHook } from 'payload/types';

const preventSelfLoop: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) return data;
  const sourceId = typeof data.source === 'string' ? data.source : data.source?.id;
  const targetId = typeof data.target === 'string' ? data.target : data.target?.id;
  if (sourceId && targetId && sourceId === targetId) {
    throw new Error('Self-loop: source and target cannot be the same Digimon.');
  }
  return data;
};

const EvolutionEdges: CollectionConfig = {
  slug: 'evolution-edges',
  labels: {
    singular: { en: 'Evolution Edge', zhTw: '進化連結' },
    plural:   { en: 'Evolution Edges', zhTw: '進化連結' },
  },
  admin: {
    useAsTitle: 'id',
    group: { en: 'Game Data', zhTw: '遊戲資料' },
    defaultColumns: ['source', 'target', 'evolutionType', 'requiredLevel', 'updatedAt'],
    listSearchableFields: ['evolutionType'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user && ['editor', 'admin', 'owner'].includes(user.role),
    update: ({ req: { user } }) => !!user && ['editor', 'admin', 'owner'].includes(user.role),
    delete: ({ req: { user } }) => !!user && ['admin', 'owner'].includes(user.role),
  },
  hooks: {
    beforeValidate: [preventSelfLoop],
    beforeChange: [
      async ({ data, req, operation }) => {
        if (!data || operation === 'delete') return data;
        const sourceId = typeof data.source === 'string' ? data.source : data.source?.id;
        const targetId = typeof data.target === 'string' ? data.target : data.target?.id;
        if (!sourceId || !targetId) return data;

        const existing = await req.payload.find({
          collection: 'evolution-edges',
          where: {
            and: [
              { source: { equals: sourceId } },
              { target: { equals: targetId } },
              { evolutionType: { equals: data.evolutionType || 'normal' } },
            ],
          },
          limit: 1,
          depth: 0,
        });

        const isDuplicate = existing.docs.some((doc: any) => {
          if (operation === 'create') return true;
          return String(doc.id) !== String((data as any)?.id);
        });

        if (isDuplicate) {
          throw new Error(
            `Duplicate edge: ${sourceId} → ${targetId} (${data.evolutionType}) already exists.`
          );
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'source',
      label: { en: 'Source Digimon', zhTw: '來源數碼獸' },
      type: 'relationship',
      relationTo: 'digimon',
      required: true,
      index: true,
      admin: { description: { en: 'Pre-evolution Digimon', zhTw: '進化前的數碼獸' } },
    },
    {
      name: 'target',
      label: { en: 'Target Digimon', zhTw: '目標數碼獸' },
      type: 'relationship',
      relationTo: 'digimon',
      required: true,
      index: true,
      admin: { description: { en: 'Post-evolution Digimon', zhTw: '進化後的數碼獸' } },
    },
    {
      name: 'evolutionType',
      label: { en: 'Evolution Type', zhTw: '進化類型' },
      type: 'select',
      required: true,
      defaultValue: 'normal',
      index: true,
      options: [
        { label: { en: 'Normal',        zhTw: '普通進化' },     value: 'normal' },
        { label: { en: 'Jogress / DNA', zhTw: '合體進化' },     value: 'jogress' },
        { label: { en: 'Digi-Egg',      zhTw: '數碼蛋進化' },   value: 'digi-egg' },
        { label: { en: 'X-Antibody',    zhTw: 'X抗體進化' },    value: 'x-antibody' },
        { label: { en: 'Variant',       zhTw: '變種進化' },     value: 'variant' },
        { label: { en: 'Alternate',     zhTw: '替代路線' },     value: 'alternate' },
        { label: { en: 'Slide',         zhTw: '滑行進化' },     value: 'slide' },
        { label: { en: 'Mode Change',   zhTw: '模式變更' },     value: 'mode-change' },
      ],
    },
    {
      name: 'requiredLevel',
      label: { en: 'Required Level', zhTw: '需求等級' },
      type: 'number',
      min: 1, max: 999,
      admin: { width: '33%' },
    },
    {
      name: 'requiredItem',
      label: { en: 'Required Item', zhTw: '需求道具' },
      type: 'text',
      admin: { width: '33%' },
    },
    {
      name: 'requiredItemQuantity',
      label: { en: 'Item Qty', zhTw: '道具數量' },
      type: 'number',
      min: 1, defaultValue: 1,
      admin: { width: '34%' },
    },
    {
      name: 'jogressPartner',
      label: { en: 'Jogress Partner', zhTw: '合體夥伴' },
      type: 'relationship',
      relationTo: 'digimon',
      admin: {
        condition: (data) => data?.evolutionType === 'jogress',
        description: { en: 'Second Digimon for Jogress/DNA', zhTw: '合體進化所需的第二隻數碼獸' },
      },
    },
    {
      name: 'conditions',
      label: { en: 'Extra Conditions', zhTw: '額外條件' },
      type: 'json',
      admin: { description: { en: 'JSON: quest reqs, stat thresholds, etc.', zhTw: '額外條件（JSON）' } },
    },
    {
      name: 'notes',
      label: { en: 'Notes', zhTw: '備註' },
      type: 'textarea',
    },
  ],
};

export default EvolutionEdges;
```

## 1.2 `evolution-graph-layouts` Collection

```ts
// apps/cms/src/collections/EvolutionGraphLayouts.ts
import type { CollectionConfig } from 'payload/types';

const EvolutionGraphLayouts: CollectionConfig = {
  slug: 'evolution-graph-layouts',
  labels: {
    singular: { en: 'Graph Layout', zhTw: '圖形佈局' },
    plural:   { en: 'Graph Layouts', zhTw: '圖形佈局' },
  },
  admin: {
    useAsTitle: 'name',
    group: { en: 'Game Data', zhTw: '遊戲資料' },
    defaultColumns: ['name', 'rootDigimon', 'isDefault', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user && ['editor', 'admin', 'owner'].includes(user.role),
    update: ({ req: { user } }) => !!user && ['editor', 'admin', 'owner'].includes(user.role),
    delete: ({ req: { user } }) => !!user && ['admin', 'owner'].includes(user.role),
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (!data?.isDefault || !data?.rootDigimon) return data;
        const rootId = typeof data.rootDigimon === 'string' ? data.rootDigimon : data.rootDigimon?.id;
        if (!rootId) return data;
        const existing = await req.payload.find({
          collection: 'evolution-graph-layouts',
          where: { and: [{ rootDigimon: { equals: rootId } }, { isDefault: { equals: true } }] },
          limit: 50, depth: 0,
        });
        for (const doc of existing.docs) {
          if (operation === 'update' && String(doc.id) === String((data as any)?.id)) continue;
          await req.payload.update({
            collection: 'evolution-graph-layouts', id: String(doc.id),
            data: { isDefault: false }, depth: 0,
          });
        }
        return data;
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true,
      label: { en: 'Layout Name', zhTw: '佈局名稱' } },
    { name: 'rootDigimon', type: 'relationship', relationTo: 'digimon', required: true, index: true,
      label: { en: 'Root Digimon', zhTw: '根數碼獸' } },
    { name: 'positions', type: 'json', required: true,
      label: { en: 'Node Positions', zhTw: '節點位置' },
      admin: { description: { en: 'Record<digimonId, {x,y}>', zhTw: '節點座標（JSON）' } } },
    { name: 'viewport', type: 'json',
      label: { en: 'Viewport', zhTw: '視角' },
      admin: { description: { en: '{x, y, zoom}', zhTw: '攝影機位置' } } },
    { name: 'isDefault', type: 'checkbox', defaultValue: false,
      label: { en: 'Default Layout', zhTw: '預設佈局' } },
  ],
};

export default EvolutionGraphLayouts;
```

## 1.3 Registration in `payload.config.ts`

```ts
// imports:
import EvolutionEdges from './collections/EvolutionEdges';
import EvolutionGraphLayouts from './collections/EvolutionGraphLayouts';

// i18nLabels additions:
'evolution-edges':         { singular: { en: 'Evolution Edge',   zhTw: '進化連結' }, plural: { en: 'Evolution Edges',  zhTw: '進化連結' } },
'evolution-graph-layouts': { singular: { en: 'Graph Layout',     zhTw: '圖形佈局' }, plural: { en: 'Graph Layouts',    zhTw: '圖形佈局' } },

// collections array additions:
withAuditHooks(withI18nLabels(EvolutionEdges)),
withAuditHooks(withI18nLabels(EvolutionGraphLayouts)),
```

## 1.4 Cascading Delete Hook on Digimon Collection

```ts
// Add to Digimon collection's hooks.afterDelete:
async ({ doc, req }) => {
  const id = String(doc.id);
  // Remove all edges referencing this Digimon
  const edges = await req.payload.find({
    collection: 'evolution-edges',
    where: { or: [{ source: { equals: id } }, { target: { equals: id } }] },
    limit: 1000, depth: 0,
  });
  for (const edge of edges.docs) {
    await req.payload.delete({ collection: 'evolution-edges', id: String(edge.id) });
  }
  // Remove graph layouts centered on this Digimon
  const layouts = await req.payload.find({
    collection: 'evolution-graph-layouts',
    where: { rootDigimon: { equals: id } },
    limit: 100, depth: 0,
  });
  for (const layout of layouts.docs) {
    await req.payload.delete({ collection: 'evolution-graph-layouts', id: String(layout.id) });
  }
}
```
