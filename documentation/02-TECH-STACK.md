# Tech Stack - DMO Knowledge Base

Complete inventory of frameworks, libraries, and tools used in this project.

---

## Frontend Stack (apps/web)

### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 14.1.0 | React framework with App Router, SSR/SSG |
| `react` | 18.2.0 | UI library |
| `react-dom` | 18.2.0 | React DOM renderer |
| `typescript` | 5.9.3 | Type safety and developer experience |

### Styling & UI
| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | 3.4.1 | Utility-first CSS framework |
| `tailwindcss-animate` | 1.0.7 | Animation utilities |
| `autoprefixer` | 10.4.17 | CSS vendor prefixes |
| `postcss` | 8.4.33 | CSS processing |
| `class-variance-authority` | 0.7.0 | Component variant styling |
| `tailwind-merge` | 2.2.0 | Tailwind class merging utility |
| `clsx` | 2.1.0 | Conditional classNames utility |

### UI Components (Radix UI)
| Package | Version | Purpose |
|---------|---------|---------|
| `@radix-ui/react-accordion` | 1.1.2 | Accordion component |
| `@radix-ui/react-avatar` | 1.1.10 | Avatar component |
| `@radix-ui/react-dialog` | 1.0.5 | Modal dialogs |
| `@radix-ui/react-dropdown-menu` | 2.1.16 | Dropdown menus |
| `@radix-ui/react-label` | 2.1.7 | Form labels |
| `@radix-ui/react-select` | 2.0.0 | Select inputs |
| `@radix-ui/react-separator` | 1.0.3 | Dividers |
| `@radix-ui/react-slot` | 1.0.2 | Component composition |
| `@radix-ui/react-tabs` | 1.0.4 | Tab navigation |
| `@radix-ui/react-toast` | 1.2.15 | Toast notifications |

### Icons
| Package | Version | Purpose |
|---------|---------|---------|
| `lucide-react` | 0.309.0 | Primary icon set |
| `react-icons` | 5.5.0 | Additional icons (Discord, etc.) |

### Rich Text Editor
| Package | Version | Purpose |
|---------|---------|---------|
| `@tiptap/react` | 2.1.13 | React wrapper for TipTap |
| `@tiptap/starter-kit` | 2.1.13 | Base extensions bundle |
| `@tiptap/extension-link` | 2.1.13 | Link support |
| `@tiptap/extension-placeholder` | 2.1.13 | Placeholder text |
| `@tiptap/pm` | 2.1.13 | ProseMirror core |

### Forms & Validation
| Package | Version | Purpose |
|---------|---------|---------|
| `react-hook-form` | 7.49.3 | Form state management |
| `@hookform/resolvers` | 3.3.4 | Validation resolver integrations |
| `zod` | 3.22.4 | Schema validation |

### Authentication
| Package | Version | Purpose |
|---------|---------|---------|
| `next-auth` | 4.24.11 | Authentication framework |
| `@auth/core` | 0.41.0 | NextAuth core |
| `@auth/mongodb-adapter` | 3.11.0 | MongoDB session storage (unused) |

### Data Visualization
| Package | Version | Purpose |
|---------|---------|---------|
| `cytoscape` | 3.33.1 | Graph visualization library |
| `cytoscape-dagre` | 2.5.0 | Directed graph layout |

### Database Client
| Package | Version | Purpose |
|---------|---------|---------|
| `mongodb` | 6.20.0 | MongoDB Node.js driver |

### Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| `next-themes` | 0.2.1 | Theme switching (dark/light) |
| `cmdk` | 0.2.0 | Command palette component |

### Dev Dependencies (Web)
| Package | Version | Purpose |
|---------|---------|---------|
| `@types/node` | 20.11.0 | Node.js type definitions |
| `@types/react` | 18.2.48 | React type definitions |
| `@types/react-dom` | 18.2.18 | React DOM type definitions |
| `eslint` | 8.56.0 | JavaScript/TypeScript linter |
| `eslint-config-next` | 14.1.0 | Next.js ESLint config |
| `@typescript-eslint/eslint-plugin` | 7.0.0 | TypeScript ESLint rules |
| `@typescript-eslint/parser` | 7.0.0 | TypeScript parser for ESLint |

---

## Backend Stack (apps/cms)

### CMS Framework
| Package | Version | Purpose |
|---------|---------|---------|
| `payload` | 2.26.0 | Headless CMS framework |
| `@payloadcms/bundler-webpack` | 1.0.7 | Webpack bundler for admin UI |
| `@payloadcms/db-mongodb` | 1.7.2 | MongoDB database adapter |
| `@payloadcms/richtext-slate` | 1.5.2 | Slate rich text editor |

### Server Framework
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | 4.18.2 | Web server framework |
| `dotenv` | 16.4.1 | Environment variable loader |

### Web Scraping
| Package | Version | Purpose |
|---------|---------|---------|
| `cheerio` | 1.1.2 | HTML parsing and manipulation |

### Email
| Package | Version | Purpose |
|---------|---------|---------|
| `nodemailer` | 6.9.8 | Email sending library |

### Image Processing
| Package | Version | Purpose |
|---------|---------|---------|
| `sharp` | 0.33.5 | High-performance image processing |

### UI Framework (Admin)
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.3.1 | Admin UI framework |
| `react-dom` | 18.3.1 | React DOM for admin |

### Validation
| Package | Version | Purpose |
|---------|---------|---------|
| `zod` | 3.22.4 | Schema validation (shared) |

### Dev Dependencies (CMS)
| Package | Version | Purpose |
|---------|---------|---------|
| `@types/express` | 4.17.21 | Express type definitions |
| `@types/node` | 20.19.21 | Node.js type definitions |
| `@types/nodemailer` | 6.4.14 | Nodemailer type definitions |
| `cross-env` | 7.0.3 | Cross-platform env variables |
| `nodemon` | 3.0.3 | Dev server auto-restart |
| `ts-node` | 10.9.2 | TypeScript execution |
| `tsconfig-paths` | 4.2.0 | TypeScript path mapping |
| `typescript` | 5.9.3 | TypeScript compiler |
| `eslint` | 8.57.1 | Linter |
| `@typescript-eslint/eslint-plugin` | 7.0.0 | TypeScript linting |
| `@typescript-eslint/parser` | 7.0.0 | TypeScript parser |

---

## Shared Package (packages/shared)

### Core
| Package | Version | Purpose |
|---------|---------|---------|
| `zod` | 3.22.4 | Validation schemas |

### Build Tool
| Package | Version | Purpose |
|---------|---------|---------|
| `tsup` | 8.0.1 | TypeScript bundler |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `@types/node` | 20.11.0 | Node.js types |
| `typescript` | 5.9.3 | TypeScript compiler |
| `eslint` | 8.57.1 | Linter |
| `@typescript-eslint/eslint-plugin` | 7.0.0 | TS linting |
| `@typescript-eslint/parser` | 7.0.0 | TS parser |

---

## Root Workspace Dependencies

### Script Execution
| Package | Version | Purpose |
|---------|---------|---------|
| `tsx` | 4.7.0 | Run TypeScript files directly |
| `dotenv` | 16.6.1 | Environment variables |

### Web Scraping (Scripts)
| Package | Version | Purpose |
|---------|---------|---------|
| `cheerio` | 1.1.2 | HTML parsing |
| `node-fetch` | 2.7.0 | HTTP requests |
| `@types/node-fetch` | 2.6.13 | Fetch type definitions |
| `puppeteer` | 24.25.0 | Headless browser automation |

### Database
| Package | Version | Purpose |
|---------|---------|---------|
| `mongodb` | 6.20.0 | MongoDB driver |

### Image Processing
| Package | Version | Purpose |
|---------|---------|---------|
| `sharp` | 0.33.5 | Image manipulation |

### HTTP Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | 4.18.2 | HTTP server (for dashboard) |
| `form-data` | 4.0.0 | Multipart form data |

### Dev Tools
| Package | Version | Purpose |
|---------|---------|---------|
| `concurrently` | 8.2.2 | Run multiple commands in parallel |
| `typescript` | 5.9.3 | TypeScript compiler |

---

## Build Tools & Linters

### Package Manager
- **pnpm** 10.17.1 (workspace protocol, monorepo support)

### TypeScript Configuration
- **Target**: ES2022
- **Module**: ESNext
- **Strict Mode**: Enabled
- **Declaration Maps**: Enabled
- **Incremental Builds**: Enabled

### ESLint Configuration
- Base: `eslint:recommended`
- TypeScript: `@typescript-eslint/recommended`
- Next.js: `eslint-config-next`
- Custom rules defined in `.eslintrc.json`

### Prettier
- Configured in `.prettierrc`
- Integrated with lint-staged

### Git Hooks (Husky)
- Pre-commit: lint-staged
- Runs linting and formatting on changed files

---

## Runtime Requirements

### Node.js
- **Minimum**: 18.17.0
- **Recommended**: 20.x LTS
- Specified in `package.json` engines field

### Database
- **MongoDB**: 6.20.0
- Local development: `mongodb://localhost:27017/dmo-kb`
- Production: MongoDB Atlas (not configured)

### Development Servers
- **Web App**: http://localhost:3000
- **CMS Admin**: http://localhost:3001
- **Mailpit**: http://localhost:8025 (email testing)

---

## External Services

### Required for Full Functionality
| Service | Purpose | Status |
|---------|---------|--------|
| MongoDB | Database | ✅ Local/Required |
| Discord OAuth | Authentication | ⚠️ Optional (needs client ID/secret) |
| DMO Wiki | Data source | ✅ Public API |
| Mailpit | Email testing | ⚠️ Dev only |

### Production Services (Not Configured)
| Service | Purpose | Status |
|---------|---------|--------|
| MongoDB Atlas | Hosted database | ❌ Not set up |
| SMTP Server | Email delivery | ❌ Using Mailpit (dev) |
| Cloudflare/CDN | Asset delivery | ❌ Not configured |
| Sentry/Error Tracking | Error monitoring | ❌ Not integrated |

---

## Version Pinning Strategy

### Exact Versions
- `sharp` - Pinned to 0.33.5 (via pnpm overrides)
- `typescript` - Pinned to 5.9.3 (via pnpm overrides)

### Caret Ranges (^)
- Most dependencies use caret ranges for patch updates
- Example: `^18.2.0` allows 18.2.x but not 19.0.0

### Workspace Protocol
- Internal packages use `workspace:*`
- Ensures local packages always use latest local version

---

## Browser Compatibility

### Supported Browsers
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions

### PWA Requirements
- Service Worker support
- Manifest.json support
- HTTPS (production)

### Target Features
- ES2022 JavaScript
- CSS Grid & Flexbox
- CSS Custom Properties
- WebP/AVIF image formats

---

## Security Dependencies

### Direct Security Measures
- NextAuth for authentication
- Zod for input validation
- CORS configuration in Payload
- CSRF protection in Payload

### Indirect Security
- Regular dependency updates needed
- No known critical vulnerabilities (as of Oct 2025)
- TypeScript prevents many runtime errors
