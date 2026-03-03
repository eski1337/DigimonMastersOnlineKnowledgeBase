import { buildConfig } from 'payload/config';
import type { CollectionConfig } from 'payload/types';
import { webpackBundler } from '@payloadcms/bundler-webpack';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { slateEditor } from '@payloadcms/richtext-slate';
import path from 'path';

import Users from './collections/Users';
import Digimon from './collections/Digimon';
import EvolutionLines from './collections/EvolutionLines';
import EvolutionEdges from './collections/EvolutionEdges';
import EvolutionGraphLayouts from './collections/EvolutionGraphLayouts';
import Items from './collections/Items';
import Maps from './collections/Maps';
import Quests from './collections/Quests';
import Guides from './collections/Guides';
import Systems from './collections/Systems';
import Tools from './collections/Tools';
import PatchNotes from './collections/PatchNotes';
import Events from './collections/Events';
import Media from './collections/Media';
import Tasks from './collections/Tasks';
import TaskComments from './collections/TaskComments';
import AuditLogs from './collections/AuditLogs';
import ProfileComments from './collections/ProfileComments';
import Conversations from './collections/Conversations';
import Messages from './collections/Messages';
import Notifications from './collections/Notifications';
import UserBlocks from './collections/UserBlocks';
import Reports from './collections/Reports';
import { withAuditHooks } from './lib/audit/hooks';

/* ── i18n collection labels (en + Traditional Chinese) ──────────── */
const i18nLabels: Record<string, { singular: Record<string, string>; plural: Record<string, string> }> = {
  users:           { singular: { en: 'User',             zhTw: '使用者' },           plural: { en: 'Users',             zhTw: '使用者' } },
  digimon:         { singular: { en: 'Digimon',           zhTw: '數碼獸' },           plural: { en: 'Digimon',           zhTw: '數碼獸' } },
  'evolution-lines':{ singular: { en: 'Evolution Line',   zhTw: '進化路線' },         plural: { en: 'Evolution Lines',   zhTw: '進化路線' } },
  'evolution-edges':{ singular: { en: 'Evolution Edge',   zhTw: '進化邊' },           plural: { en: 'Evolution Edges',   zhTw: '進化邊' } },
  'evolution-graph-layouts':{ singular: { en: 'Graph Layout', zhTw: '圖表佈局' },        plural: { en: 'Graph Layouts',     zhTw: '圖表佈局' } },
  items:           { singular: { en: 'Item',              zhTw: '道具' },             plural: { en: 'Items',             zhTw: '道具' } },
  maps:            { singular: { en: 'Map',               zhTw: '地圖' },             plural: { en: 'Maps',              zhTw: '地圖' } },
  quests:          { singular: { en: 'Quest',             zhTw: '任務' },             plural: { en: 'Quests',            zhTw: '任務' } },
  guides:          { singular: { en: 'Guide',             zhTw: '攻略' },             plural: { en: 'Guides',            zhTw: '攻略' } },
  systems:         { singular: { en: 'System',            zhTw: '系統' },             plural: { en: 'Systems',           zhTw: '系統' } },
  tools:           { singular: { en: 'Tool',              zhTw: '工具' },             plural: { en: 'Tools',             zhTw: '工具' } },
  patchNotes:      { singular: { en: 'Patch Note',        zhTw: '更新公告' },         plural: { en: 'Patch Notes',       zhTw: '更新公告' } },
  events:          { singular: { en: 'Event',             zhTw: '活動' },             plural: { en: 'Events',            zhTw: '活動' } },
  media:           { singular: { en: 'Media',             zhTw: '媒體' },             plural: { en: 'Media',             zhTw: '媒體' } },
  tasks:           { singular: { en: 'Task',              zhTw: '工作' },             plural: { en: 'Tasks',             zhTw: '工作' } },
  'task-comments':  { singular: { en: 'Task Comment',     zhTw: '工作留言' },         plural: { en: 'Task Comments',     zhTw: '工作留言' } },
  'audit-logs':     { singular: { en: 'Audit Log',        zhTw: '稽核紀錄' },         plural: { en: 'Audit Logs',        zhTw: '稽核紀錄' } },
  'profile-comments':{ singular: { en: 'Profile Comment', zhTw: '個人檔案留言' },     plural: { en: 'Profile Comments',  zhTw: '個人檔案留言' } },
  conversations:   { singular: { en: 'Conversation',      zhTw: '對話' },             plural: { en: 'Conversations',     zhTw: '對話' } },
  messages:        { singular: { en: 'Message',           zhTw: '訊息' },             plural: { en: 'Messages',          zhTw: '訊息' } },
  notifications:   { singular: { en: 'Notification',      zhTw: '通知' },             plural: { en: 'Notifications',     zhTw: '通知' } },
  'user-blocks':    { singular: { en: 'User Block',       zhTw: '封鎖' },             plural: { en: 'User Blocks',       zhTw: '封鎖' } },
  reports:         { singular: { en: 'Report',            zhTw: '檢舉' },             plural: { en: 'Reports',           zhTw: '檢舉' } },
};
function withI18nLabels(cfg: CollectionConfig): CollectionConfig {
  const labels = i18nLabels[cfg.slug];
  return labels ? { ...cfg, labels } : cfg;
}
import KanbanView from './views/Kanban/index';
import KanbanNavLink from './views/Kanban/NavLink';
import RegionEditor from './views/RegionEditor/index';
import RegionEditorNavLink from './views/RegionEditor/NavLink';
import Dashboard from './views/Dashboard/index';
import CustomLogin from './components/CustomLogin';
import PageJumpProvider from './components/PageJumpProvider';
import LanguageSyncProvider from './components/LanguageSyncProvider';
import resendVerification from './endpoints/resendVerification';
import updateDigimonSkills from './endpoints/update-digimon-skills';
import { getLogsEndpoint, clearLogsEndpoint } from './endpoints/logs';
import LogViewer from './views/LogViewer/index';
import LogViewerNavLink from './views/LogViewer/NavLink';
import ServerHealthDashboard from './views/ServerHealth/index';
import ServerHealthNavLink from './views/ServerHealth/NavLink';
import AdminBackupsPage from './views/Backups/index';
import BackupsNavLink from './views/Backups/NavLink';
import EvolutionEditor from './views/EvolutionEditor/index';
import EvolutionEditorNavLink from './views/EvolutionEditor/NavLink';

export default buildConfig({
  rateLimit: {
    window: 15 * 60 * 1000, // 15 minutes
    max: 2000, // generous limit
    trustProxy: true,
  },
  serverURL: process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info',
  admin: {
    user: Users.slug,
    bundler: webpackBundler(),
    meta: {
      titleSuffix: '- DMO KB CMS',
      favicon: '/favicon.ico',
      ogImage: '/og-image.png',
    },
    css: path.resolve(__dirname, 'styles/custom.css'),
    components: {
      beforeLogin: [CustomLogin],
      beforeDashboard: [Dashboard],
      providers: [PageJumpProvider, LanguageSyncProvider],
      views: {
        kanban: {
          Component: KanbanView,
          path: '/kanban',
        },
        'region-editor': {
          Component: RegionEditor,
          path: '/region-editor',
        },
        'log-viewer': {
          Component: LogViewer,
          path: '/log-viewer',
        },
        'server-health': {
          Component: ServerHealthDashboard,
          path: '/server-health',
        },
        backups: {
          Component: AdminBackupsPage,
          path: '/backups',
        },
        'evolution-editor': {
          Component: EvolutionEditor,
          path: '/evolution-editor',
        },
      },
      afterNavLinks: [KanbanNavLink, RegionEditorNavLink, LogViewerNavLink, ServerHealthNavLink, BackupsNavLink, EvolutionEditorNavLink],
    },
  },
  i18n: {
    supportedLngs: ['en', 'zhTw'],
    fallbackLng: {
      'zh-HK': ['zhTw', 'en'],
      'zh-TW': ['zhTw', 'en'],
      'zh-CN': ['zhTw', 'en'],
      zh: ['zhTw', 'en'],
      default: ['en'],
    },
  },
  editor: slateEditor({}),
  collections: [
    withAuditHooks(withI18nLabels(Users)),
    withAuditHooks(withI18nLabels(Digimon)),
    withAuditHooks(withI18nLabels(EvolutionLines)),
    withAuditHooks(withI18nLabels(EvolutionEdges)),
    withAuditHooks(withI18nLabels(EvolutionGraphLayouts)),
    withAuditHooks(withI18nLabels(Items)),
    withAuditHooks(withI18nLabels(Maps)),
    withAuditHooks(withI18nLabels(Quests)),
    withAuditHooks(withI18nLabels(Guides)),
    withAuditHooks(withI18nLabels(Systems)),
    withAuditHooks(withI18nLabels(Tools)),
    withAuditHooks(withI18nLabels(PatchNotes)),
    withAuditHooks(withI18nLabels(Events)),
    withAuditHooks(withI18nLabels(Media)),
    withAuditHooks(withI18nLabels(Tasks)),
    withAuditHooks(withI18nLabels(TaskComments)),
    withAuditHooks(withI18nLabels(ProfileComments)),
    withAuditHooks(withI18nLabels(Conversations)),
    withAuditHooks(withI18nLabels(Messages)),
    withI18nLabels(Notifications), // Not audited — high-volume, ephemeral
    withAuditHooks(withI18nLabels(UserBlocks)),
    withAuditHooks(withI18nLabels(Reports)),
    withI18nLabels(AuditLogs), // Not wrapped — must not audit itself
  ],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  db: mongooseAdapter({
    url: process.env.MONGODB_URI!,
  }),
  email: process.env.SMTP_HOST ? {
    fromName: 'DMO Knowledge Base',
    fromAddress: process.env.EMAIL_FROM || 'noreply@dmokb.info',
    transportOptions: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      ...(process.env.SMTP_USER ? {
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      } : {}),
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    },
  } : {
    fromName: 'DMO Knowledge Base',
    fromAddress: process.env.EMAIL_FROM || 'noreply@dmokb.local',
    logMockCredentials: true,
  },
  endpoints: [resendVerification, updateDigimonSkills, getLogsEndpoint, clearLogsEndpoint],
  cors: [
    process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info',
    'https://dmokb.info',
    'https://cms.dmokb.info',
  ],
  csrf: [
    process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info',
    'https://dmokb.info',
    'https://cms.dmokb.info',
  ],
});
