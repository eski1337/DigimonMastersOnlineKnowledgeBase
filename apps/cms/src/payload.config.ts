import { buildConfig } from 'payload/config';
import { webpackBundler } from '@payloadcms/bundler-webpack';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { slateEditor } from '@payloadcms/richtext-slate';
import path from 'path';

import Users from './collections/Users';
import Digimon from './collections/Digimon';
import EvolutionLines from './collections/EvolutionLines';
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
import KanbanView from './views/Kanban/index';
import KanbanNavLink from './views/Kanban/NavLink';
import RegionEditor from './views/RegionEditor/index';
import RegionEditorNavLink from './views/RegionEditor/NavLink';
import Dashboard from './views/Dashboard/index';
import BeforeLogin from './components/BeforeLogin';
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
      beforeLogin: [BeforeLogin],
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
      },
      afterNavLinks: [KanbanNavLink, RegionEditorNavLink, LogViewerNavLink, ServerHealthNavLink, BackupsNavLink],
    },
  },
  editor: slateEditor({}),
  collections: [
    withAuditHooks(Users),
    withAuditHooks(Digimon),
    withAuditHooks(EvolutionLines),
    withAuditHooks(Items),
    withAuditHooks(Maps),
    withAuditHooks(Quests),
    withAuditHooks(Guides),
    withAuditHooks(Tools),
    withAuditHooks(PatchNotes),
    withAuditHooks(Events),
    withAuditHooks(Media),
    withAuditHooks(Tasks),
    withAuditHooks(TaskComments),
    withAuditHooks(ProfileComments),
    withAuditHooks(Conversations),
    withAuditHooks(Messages),
    Notifications, // Not audited — high-volume, ephemeral
    withAuditHooks(UserBlocks),
    withAuditHooks(Reports),
    AuditLogs, // Not wrapped — must not audit itself
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
