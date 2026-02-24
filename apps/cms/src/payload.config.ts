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
import KanbanNavLink from './views/Kanban/NavLink';
import resendVerification from './endpoints/resendVerification';
import updateDigimonSkills from './endpoints/update-digimon-skills';

export default buildConfig({
  serverURL: process.env.NODE_ENV === 'production'
    ? 'https://cms.dmokb.info'
    : (process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001'),
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
      views: {
        kanban: {
          Component: path.resolve(__dirname, 'views/Kanban/index.tsx') as any,
          path: '/kanban',
        },
      },
      afterNavLinks: [KanbanNavLink],
    },
  },
  editor: slateEditor({}),
  collections: [Users, Digimon, EvolutionLines, Items, Maps, Quests, Guides, Tools, PatchNotes, Events, Media, Tasks, TaskComments],
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
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    },
  } : {
    fromName: 'DMO Knowledge Base',
    fromAddress: process.env.EMAIL_FROM || 'noreply@dmokb.local',
    logMockCredentials: true,
  },
  endpoints: [resendVerification, updateDigimonSkills],
  cors: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'https://dmokb.info',
    'https://cms.dmokb.info',
  ],
  csrf: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'https://dmokb.info',
    'https://cms.dmokb.info',
  ],
});
