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
  users:           { singular: { en: 'User',             zh: '使用者' },           plural: { en: 'Users',             zh: '使用者' } },
  digimon:         { singular: { en: 'Digimon',           zh: '數碼獸' },           plural: { en: 'Digimon',           zh: '數碼獸' } },
  'evolution-lines':{ singular: { en: 'Evolution Line',   zh: '進化路線' },         plural: { en: 'Evolution Lines',   zh: '進化路線' } },
  'evolution-edges':{ singular: { en: 'Evolution Edge',   zh: '進化邊' },           plural: { en: 'Evolution Edges',   zh: '進化邊' } },
  'evolution-graph-layouts':{ singular: { en: 'Graph Layout', zh: '圖表佈局' },        plural: { en: 'Graph Layouts',     zh: '圖表佈局' } },
  items:           { singular: { en: 'Item',              zh: '道具' },             plural: { en: 'Items',             zh: '道具' } },
  maps:            { singular: { en: 'Map',               zh: '地圖' },             plural: { en: 'Maps',              zh: '地圖' } },
  quests:          { singular: { en: 'Quest',             zh: '任務' },             plural: { en: 'Quests',            zh: '任務' } },
  guides:          { singular: { en: 'Guide',             zh: '攻略' },             plural: { en: 'Guides',            zh: '攻略' } },
  tools:           { singular: { en: 'Tool',              zh: '工具' },             plural: { en: 'Tools',             zh: '工具' } },
  patchNotes:      { singular: { en: 'Patch Note',        zh: '更新公告' },         plural: { en: 'Patch Notes',       zh: '更新公告' } },
  events:          { singular: { en: 'Event',             zh: '活動' },             plural: { en: 'Events',            zh: '活動' } },
  media:           { singular: { en: 'Media',             zh: '媒體' },             plural: { en: 'Media',             zh: '媒體' } },
  tasks:           { singular: { en: 'Task',              zh: '工作' },             plural: { en: 'Tasks',             zh: '工作' } },
  'task-comments':  { singular: { en: 'Task Comment',     zh: '工作留言' },         plural: { en: 'Task Comments',     zh: '工作留言' } },
  'audit-logs':     { singular: { en: 'Audit Log',        zh: '稽核紀錄' },         plural: { en: 'Audit Logs',        zh: '稽核紀錄' } },
  'profile-comments':{ singular: { en: 'Profile Comment', zh: '個人檔案留言' },     plural: { en: 'Profile Comments',  zh: '個人檔案留言' } },
  conversations:   { singular: { en: 'Conversation',      zh: '對話' },             plural: { en: 'Conversations',     zh: '對話' } },
  messages:        { singular: { en: 'Message',           zh: '訊息' },             plural: { en: 'Messages',          zh: '訊息' } },
  notifications:   { singular: { en: 'Notification',      zh: '通知' },             plural: { en: 'Notifications',     zh: '通知' } },
  'user-blocks':    { singular: { en: 'User Block',       zh: '封鎖' },             plural: { en: 'User Blocks',       zh: '封鎖' } },
  reports:         { singular: { en: 'Report',            zh: '檢舉' },             plural: { en: 'Reports',           zh: '檢舉' } },
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
      providers: [PageJumpProvider],
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
    supportedLngs: ['en', 'zh'],
    fallbackLng: 'en',
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
