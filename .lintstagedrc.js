/**
 * Lint-staged configuration
 * 
 * Runs linters and formatters on staged files before commit.
 */

module.exports = {
  // TypeScript/JavaScript files
  '**/*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  
  // JSON files
  '**/*.json': [
    'prettier --write',
  ],
  
  // Markdown files
  '**/*.md': [
    'prettier --write',
  ],
  
  // CSS files
  '**/*.css': [
    'prettier --write',
  ],
};
