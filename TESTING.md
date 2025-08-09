# Testing Guide

This document outlines the comprehensive testing strategy for the Cyber Command Chef application.

## Test Structure

### Unit Tests

- **Location**: `src/**/*.test.{ts,tsx}`
- **Purpose**: Test individual functions and components in isolation
- **Framework**: Vitest + React Testing Library
- **Coverage**: Utilities, validation, error handling, storage

### Integration Tests

- **Location**: `src/test/integration.test.tsx`
- **Purpose**: Test complex user workflows and component interactions
- **Framework**: Vitest + React Testing Library + React DnD Test Backend

### End-to-End Tests

- **Location**: `e2e/**/*.spec.ts`
- **Purpose**: Test complete user journeys in a real browser
- **Framework**: Playwright
- **Coverage**: Cross-browser testing, mobile responsiveness, accessibility

### Performance Tests

- **Location**: `src/test/performance.bench.ts`
- **Purpose**: Benchmark critical functions and operations
- **Framework**: Vitest benchmarks

### Accessibility Tests

- **Location**: `src/test/accessibility.test.tsx`
- **Purpose**: Ensure WCAG 2.1 AA compliance
- **Framework**: jest-axe + Playwright axe integration

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### End-to-End Tests

```bash
npm run test:e2e
```

### E2E Tests with UI

```bash
npm run test:e2e:ui
```

### Performance Benchmarks

```bash
npm run test -- --run src/test/performance.bench.ts
```

## Test Configuration

### Vitest Configuration

- **File**: `vitest.config.ts`
- **Environment**: jsdom
- **Setup**: `src/test/setup.ts`
- **Coverage**: v8 provider with 80% thresholds

### Playwright Configuration

- **File**: `playwright.config.ts`
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome/Safari
- **Features**: Screenshots, videos, traces on failure

## Test Utilities

### Custom Render Functions

```typescript
// For components using drag-and-drop
renderWithDnd(component);

// For accessibility testing
testAccessibility(container);
```

### Mock Data

- `mockCommand`: Sample command for testing
- `mockModifier`: Sample modifier for testing
- `mockChain`: Sample command chain for testing

### Performance Utilities

```typescript
measurePerformance(() => expensiveOperation());
measureAsyncPerformance(async () => await asyncOperation());
```

## Coverage Thresholds

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## Continuous Integration

### GitHub Actions Workflows

- **Unit Tests**: Run on Node.js 18.x and 20.x
- **E2E Tests**: Cross-browser testing
- **Accessibility**: Automated a11y checks
- **Performance**: Benchmark regression detection
- **Security**: Dependency auditing

### Quality Gates

- All tests must pass
- Coverage thresholds must be met
- No accessibility violations
- No security vulnerabilities above moderate level

## Writing Tests

### Unit Test Example

```typescript
describe("Component", () => {
  it("should render correctly", () => {
    render(<Component prop="value" />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });
});
```

### Integration Test Example

```typescript
describe("User Workflow", () => {
  it("should complete drag and drop operation", async () => {
    const user = userEvent.setup();
    renderWithDnd(<App />);

    const command = screen.getByText("Command");
    const dropZone = screen.getByText("Drop Zone");

    await user.dragAndDrop(command, dropZone);

    expect(screen.getByText("Dropped Command")).toBeInTheDocument();
  });
});
```

### E2E Test Example

```typescript
test("should handle user interaction", async ({ page }) => {
  await page.goto("/");
  await page.click('button[data-testid="action-button"]');
  await expect(page.locator(".result")).toBeVisible();
});
```

### Accessibility Test Example

```typescript
it("should be accessible", async () => {
  const { container } = render(<Component />);
  await testAccessibility(container);
});
```

## Best Practices

### Test Organization

- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Mocking

- Mock external dependencies
- Use realistic test data
- Reset mocks between tests

### Async Testing

- Use proper async/await patterns
- Wait for elements to appear
- Handle loading states

### Accessibility

- Test keyboard navigation
- Verify ARIA attributes
- Check color contrast
- Test screen reader compatibility

### Performance

- Benchmark critical paths
- Monitor memory usage
- Test with large datasets
- Measure render times

## Debugging Tests

### Debug Mode

```bash
npm run test:ui
```

### Browser DevTools

```bash
npm run test:e2e:ui
```

### Coverage Analysis

```bash
npm run test:coverage
open coverage/index.html
```

## Common Issues

### Test Timeouts

- Increase timeout for slow operations
- Use proper waiting strategies
- Mock time-dependent code

### Flaky Tests

- Avoid hard-coded delays
- Use proper waiting mechanisms
- Isolate test dependencies

### Memory Leaks

- Clean up event listeners
- Reset global state
- Dispose of resources

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [jest-axe Documentation](https://github.com/nickcolley/jest-axe)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
