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
  },
  editor: slateEditor({}),
  collections: [Users, Digimon, EvolutionLines, Items, Maps, Quests, Guides, Tools, PatchNotes, Events, Media],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  db: mongooseAdapter({
    url: process.env.MONGODB_URI!,
  }),
  email: {
    fromName: 'DMO Knowledge Base',
    fromAddress: process.env.EMAIL_FROM || 'noreply@dmokb.local',
    logMockCredentials: true, // Logs mock email credentials to console in dev
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
