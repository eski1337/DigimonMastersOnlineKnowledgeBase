# Documentation Index

Central hub for all DMO Knowledge Base documentation.

---

## Getting Started

- [README](../README.md) - Project overview and quick start
- [GETTING_STARTED](../GETTING_STARTED.md) - Detailed setup guide
- [CHANGELOG](../CHANGELOG.md) - Version history and changes

---

## Core Documentation

### [01-PROJECT-OVERVIEW](./01-PROJECT-OVERVIEW.md)
**Project status, architecture summary, and key achievements**

### [02-TECH-STACK](./02-TECH-STACK.md)
**Complete inventory of frameworks, libraries, and tools**

### [03-ARCHITECTURE](./03-ARCHITECTURE.md)
**Project structure, data flow, and architectural patterns**

### [04-DEVELOPMENT](./04-DEVELOPMENT.md)
**Setup, build, and development workflow**

### [05-API-ROUTES](./05-API-ROUTES.md)
**Frontend routes and API endpoints reference**

### [06-DATA-MODELS](./06-DATA-MODELS.md)
**Database schemas and Payload collections**

### [07-ENVIRONMENT](./07-ENVIRONMENT.md)
**Environment variables reference and setup**

### [08-SECURITY](./08-SECURITY.md)
**Authentication, authorization, and security practices**

### [09-ISSUES-TODOS](./09-ISSUES-TODOS.md)
**Known issues and technical debt**

### [10-METRICS](./10-METRICS.md)
**Project statistics and code quality metrics**

---

## Extended Documentation

### [11-ARCHITECTURE](./11-ARCHITECTURE.md)
**Enhanced system map, request lifecycle, and auth boundaries**

- Detailed system map diagram
- Request lifecycle flows (SSR, API, Auth, Content)
- Authentication boundaries (public, authenticated, role-based)

### [12-CONTENT-MODELS](./12-CONTENT-MODELS.md)
**Complete Payload CMS schema reference**

- All 11 collections with full field definitions
- Relationships and indexing strategy
- Migration notes

### [13-ENVIRONMENT](./13-ENVIRONMENT.md)
**Comprehensive environment variables guide**

- All variable names with descriptions
- Setup instructions per environment
- Security best practices
- Troubleshooting common issues

### [14-SEARCH](./14-SEARCH.md)
**Search implementation and enhancement path**

- Current MongoDB text search approach
- API endpoint specification
- Response format and validation
- Future enhancements (Algolia, Meilisearch)

### [15-I18N](./15-I18N.md)
**Internationalization strategy**

- Multi-language support plan (Japanese, Korean, Chinese)
- Collection field localization
- Frontend i18n setup (next-intl)
- Translation workflow and rollout plan

### [16-ROADMAP](./16-ROADMAP.md)
**Top 10 next steps with concrete paths**

- Critical priorities (refactor, tests, deployment)
- Sprint planning with effort estimates
- Owner assignments and file paths

### [17-TESTING](./17-TESTING.md)
**Testing strategy and implementation**

- Test infrastructure setup (Vitest, Playwright)
- Unit, integration, and E2E examples
- Coverage goals and CI/CD integration

### [18-EDITOR-GUIDE](./18-EDITOR-GUIDE.md)
**Content author workflow guide**

- Accessing CMS and creating content
- Working with images and relationships
- Publishing workflow and troubleshooting

---

## Development

### [DEVELOPMENT](../GETTING_STARTED.md)
**Setup, build, and development workflow**

- Prerequisites
- Initial setup
- Development workflow
- Build commands
- Database management
- Debugging

### [TESTING](./TESTING.md)
**Testing strategy and examples**

- Folder structure
- Setup instructions (Vitest, Playwright)
- Test examples (unit, integration, E2E)
- Coverage goals
- CI/CD integration

### [DATA_IMPORT_GUIDE](./DATA_IMPORT_GUIDE.md)
**Bulk importing content from DMO Wiki**

- Import methods
- Script usage
- Troubleshooting

---

## Features

### [SEARCH](./SEARCH.md)
**Search implementation and enhancement path**

- Current approach (MongoDB text search)
- API endpoint (/api/search)
- Query validation and rate limiting
- Response shape
- Relevance strategy
- Future enhancements (Algolia, Meilisearch)

### [I18N](./I18N.md)
**Internationalization strategy**

- Localization plan (Japanese, Korean, Chinese)
- Collection field localization
- Slug strategy
- Frontend i18n (next-intl)
- Translation workflow
- Rollout plan

---

## Operations

### [DEPLOYMENT](./DEPLOYMENT.md)
**Local and production deployment**

- Local development setup
- Vercel deployment (frontend)
- VPS/Railway deployment (CMS)
- Environment configuration
- CORS/CSRF setup
- Database migration
- Monitoring

### [SECURITY](./SECURITY.md)
**Security architecture and best practices**

- Authentication (NextAuth, JWT)
- Authorization (RBAC)
- Discord role sync
- Dev-only role auto-upgrade
- CORS/CSRF protection
- Input validation
- Rate limiting
- Production checklist

---

## Content Management

### [EDITOR_GUIDE](./EDITOR_GUIDE.md)
**Guide for content authors**

- Accessing the CMS
- Creating content (Digimon, Guides, Quests, Maps)
- Working with images
- Slugs and URLs
- Publishing workflow
- Tags and categories
- Troubleshooting

### [BULK_IMPORT_GUIDE](../BULK_IMPORT_GUIDE.md)
**Automated content import**

- DMO Wiki scraping
- Bulk import scripts
- Image handling
- Error recovery

---

## Planning

### [ROADMAP](./ROADMAP.md)
**Top 10 next steps with owners**

1. Refactor monolithic server.ts
2. Implement automated tests
3. Production deployment setup
4. Enforce rate limiting
5. Implement structured logging
6. Security hardening
7. CI/CD pipeline
8. Database indexing
9. Component documentation
10. Enhanced search

### [CONTRIBUTING](./CONTRIBUTING.md)
**Contributing guidelines**

- Code style
- Commit conventions
- Pull request process
- Testing requirements

---

## Reference

### Technical Documentation (Apps)

**Frontend (apps/web)**:
- Next.js 14 App Router
- React 18 with TypeScript
- TailwindCSS + shadcn/ui
- NextAuth authentication
- API routes

**Backend (apps/cms)**:
- Payload CMS v2
- Express server
- MongoDB via Mongoose
- DMO Wiki scraper
- Image processing (Sharp)

**Shared (packages/shared)**:
- TypeScript types
- Zod validation schemas
- Constants (elements, ranks, families)

### Additional Guides

- [AUTHENTICATION_GUIDE](../AUTHENTICATION_GUIDE.md) - Auth setup and troubleshooting
- [DISCORD_SETUP](./DISCORD_SETUP.md) - Discord OAuth configuration
- [HOW_TO_USE_VISUAL_EDITOR](../HOW_TO_USE_VISUAL_EDITOR.md) - Visual evolution editor
- [EMAIL_VERIFICATION_SETUP](../EMAIL_VERIFICATION_SETUP.md) - Email configuration
- [DEPLOYMENT_CHECKLIST](../DEPLOYMENT_CHECKLIST.md) - Pre-deployment checks

---

## Issue Tracking

### [Issues & Technical Debt](../documentation/09-ISSUES-TODOS.md)
**Known issues and priority action items**

- Critical issues (monolithic server.ts, no tests)
- High priority (rate limiting, logging, prod deployment)
- Medium priority (error boundaries, migrations)
- Future enhancements

### [Metrics](../documentation/10-METRICS.md)
**Project statistics and code quality**

- File counts
- Lines of code
- Dependencies
- Database schema metrics
- Performance metrics

---

## Quick Links

| Documentation | Purpose |
|---------------|---------|
| [ARCHITECTURE](./ARCHITECTURE.md) | System design |
| [CONTENT_MODELS](./CONTENT_MODELS.md) | Database schemas |
| [ENVIRONMENT](./ENVIRONMENT.md) | Environment variables |
| [SECURITY](./SECURITY.md) | Auth & security |
| [TESTING](./TESTING.md) | Test strategy |
| [SEARCH](./SEARCH.md) | Search implementation |
| [I18N](./I18N.md) | Internationalization |
| [DEPLOYMENT](./DEPLOYMENT.md) | Deployment guide |
| [EDITOR_GUIDE](./EDITOR_GUIDE.md) | Content editing |
| [ROADMAP](./ROADMAP.md) | Future plans |

---

## Documentation Standards

### File Naming

- **UPPERCASE.md**: Root-level project docs (README, CHANGELOG)
- **PascalCase.md**: Feature/topic docs (Authentication, Deployment)
- **lowercase.md**: Utility docs (package.json comments)

### Structure

Each doc should include:
- **Purpose** statement
- **Table of contents** (if >500 lines)
- **Code examples** with syntax highlighting
- **File paths** (absolute, starting with `apps/` or `docs/`)
- **Links** to related docs (relative paths)
- **Last updated** date (if frequently changing)

### Maintenance

- Review quarterly
- Update when features change
- Keep examples up to date
- Remove outdated information
- Add to CHANGELOG when docs change significantly

---

## Contributing to Docs

1. Follow existing format and style
2. Use markdown formatting consistently
3. Add code examples where helpful
4. Link to related documentation
5. Keep content concise and scannable
6. Test all commands and code samples
7. Update this index when adding new docs

---

**Last Updated**: October 30, 2025  
**Maintainer**: Project owner  
**Issues**: Report via GitHub or contact owner
