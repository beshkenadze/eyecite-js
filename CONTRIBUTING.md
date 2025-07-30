# Contributing to eyecite-js

First off, thank you for considering contributing to eyecite-js! It's people like you that make eyecite-js such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct: be respectful, be welcoming, and be considerate.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible using our [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and include as many details as possible.

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Development Setup

1. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/eyecite-js.git
   cd eyecite-js
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Run tests**
   ```bash
   bun test
   ```

4. **Run linter**
   ```bash
   bun run lint
   ```

5. **Run type checking**
   ```bash
   bun run typecheck
   ```

## Development Workflow

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them with descriptive messages:
   ```bash
   git add .
   git commit -m "feat: add new citation type support"
   ```

3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Open a Pull Request

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that do not affect the meaning of the code
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding missing tests or correcting existing tests
- `chore:` Changes to the build process or auxiliary tools

## Testing Guidelines

- Write tests for any new functionality
- Ensure all tests pass before submitting PR
- Include both positive and negative test cases
- Test edge cases

Example test:
```typescript
import { test, expect } from "bun:test"
import { getCitations } from "../src"

test("should extract full case citation", () => {
  const text = "Bush v. Gore, 531 U.S. 98 (2000)"
  const citations = getCitations(text)
  
  expect(citations).toHaveLength(1)
  expect(citations[0].constructor.name).toBe("FullCaseCitation")
})
```

## Style Guide

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing! 🎉