# Contributing Guide

Thank you for your interest in contributing to DMO KB! This guide will help you get started.

## Code of Conduct

- Be respectful and inclusive
- Help others learn and grow
- Focus on constructive feedback
- Credit sources and respect copyrights

## Getting Started

### Prerequisites

- Node.js >= 18.17.0
- pnpm >= 8.0.0
- Docker (for MongoDB + Mailpit)
- Git

### Setup

1. **Fork and clone**
   ```bash
   git clone https://github.com/yourusername/dmo-kb.git
   cd dmo-kb
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Start services**
   ```bash
   pnpm docker:up
   pnpm dev:cms  # Terminal 1
   pnpm dev      # Terminal 2
   ```

5. **Create admin user**
   - Visit http://localhost:3001/admin
   - Create your first user

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: New features
- `fix/*`: Bug fixes
- `docs/*`: Documentation updates

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow TypeScript strict mode
   - Use existing patterns and components
   - Add comments for complex logic

3. **Test your changes**
   ```bash
   pnpm typecheck  # Type checking
   pnpm lint       # Linting
   pnpm build      # Build test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation
   - `style:` Formatting
   - `refactor:` Code refactoring
   - `test:` Tests
   - `chore:` Maintenance

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub.

## Contributing Content

### Adding Digimon

1. Log in to CMS at http://localhost:3001/admin
2. Navigate to Digimon collection
3. Click "Create New"
4. Fill in required fields:
   - Name (required)
   - Slug (URL-friendly, e.g., "agumon")
   - Rank, Element, Attribute
   - Stats, Skills, Forms
5. Add sources for data verification
6. Save as draft or publish

### Adding Guides

1. Navigate to Guides collection
2. Use Tiptap editor for rich content
3. Add appropriate tags
4. Include code examples, images, links
5. Preview before publishing

### Data Verification

Always cite sources:
- Official DMO website
- Game files (with permission)
- Community-verified data

Include in `sources` field:
```
Source: Official DMO Wiki
Verified: 2024-01-15
```

## Code Style

### TypeScript

```typescript
// ✅ Good
export interface DigimonCardProps {
  digimon: Digimon;
  onSelect?: (id: string) => void;
}

export function DigimonCard({ digimon, onSelect }: DigimonCardProps) {
  // Implementation
}

// ❌ Avoid
export function DigimonCard(props: any) {
  // Implementation
}
```

### React Components

- Use functional components
- Prefer Server Components (default)
- Use Client Components when needed (`'use client'`)
- Extract reusable logic to hooks
- Keep components focused and small

### Styling

- Use Tailwind utility classes
- Follow Gruvbox color palette
- Use semantic color variables
- Ensure accessibility (contrast, focus states)

```tsx
// ✅ Good
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Click Me
</button>

// ❌ Avoid inline styles
<button style={{ backgroundColor: '#fabd2f' }}>
  Click Me
</button>
```

### File Organization

```
src/
├── app/                    # Pages (App Router)
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── digimon/           # Feature-specific
│   └── layout/            # Layout components
├── lib/                   # Utilities
└── types/                 # Additional types
```

## Testing

### Manual Testing Checklist

- [ ] Page loads without errors
- [ ] Responsive on mobile/tablet/desktop
- [ ] Keyboard navigation works
- [ ] Screen reader accessible
- [ ] Dark mode renders correctly
- [ ] Forms validate properly
- [ ] Links work

### Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## Documentation

### Code Comments

```typescript
/**
 * Calculates perfect clone stats for a Digimon
 * @param baseStats - Original Digimon stats
 * @param cloneLevel - Clone level (1-5)
 * @returns Calculated clone stats
 */
export function calculateCloneStats(
  baseStats: DigimonStats,
  cloneLevel: number
): DigimonStats {
  // Implementation
}
```

### README Updates

- Update README.md for new features
- Add usage examples
- Update scripts section if needed

## Pull Request Guidelines

### PR Title

Use Conventional Commits format:
```
feat(digimon): add evolution graph visualization
fix(filters): correct element filter logic
docs: update contributing guide
```

### PR Description

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Passes typecheck
- [ ] Passes lint
- [ ] Responsive design verified

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex logic
- [ ] Updated documentation
```

### Review Process

1. Automated checks run (typecheck, lint, build)
2. Maintainers review code
3. Address feedback
4. Approval required before merge
5. Squash and merge to main

## Getting Help

- **Discord**: [Join our server](#)
- **GitHub Issues**: Report bugs or request features
- **Discussions**: Ask questions, share ideas

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Given contributor role on Discord

## Legal

By contributing, you agree that:
- Your contributions are your original work
- You have rights to contribute the code
- Contributions are under the project's license
- You respect DMO intellectual property
- You provide accurate data sources

## Thank You!

Every contribution helps make DMO KB better for the community. Thank you for your time and effort! 🎉
