# Dark Mode Implementation Guide

## Overview

The Ribh e-commerce platform now features a comprehensive dark mode implementation that supports:
- **Light Mode**: Traditional light theme
- **Dark Mode**: Dark theme for better eye comfort
- **System Mode**: Automatically follows the user's system preference

## Features

### 🎨 Theme Support
- **Three theme modes**: Light, Dark, and System
- **Automatic system detection**: Follows user's OS preference
- **Persistent storage**: Remembers user's choice in localStorage
- **Smooth transitions**: 300ms transitions between themes
- **No flash of incorrect theme**: Prevents FOUC (Flash of Unstyled Content)

### 🔧 Technical Implementation

#### ThemeProvider
The main theme management is handled by `components/providers/ThemeProvider.tsx`:

```typescript
interface ThemeContextType {
  theme: Theme;           // Current theme setting
  setTheme: (theme: Theme) => void;  // Set theme function
  toggleTheme: () => void;           // Cycle through themes
  resolvedTheme: 'light' | 'dark';   // Actual applied theme
}
```

#### Usage in Components
```typescript
import { useTheme } from '@/components/providers/ThemeProvider';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  return (
    <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      Current theme: {theme}
    </div>
  );
}
```

### 🎯 Theme Toggle Components

#### 1. Default Theme Toggle
```typescript
import ThemeToggle from '@/components/ui/ThemeToggle';

// Cycles: Light → Dark → System → Light
<ThemeToggle />
```

#### 2. Compact Theme Toggle
```typescript
import { ThemeToggleCompact } from '@/components/ui/ThemeToggle';

// Smaller version for tight spaces
<ThemeToggleCompact />
```

#### 3. System Theme Toggle
```typescript
import { ThemeToggleSystem } from '@/components/ui/ThemeToggle';

// Shows all three options
<ThemeToggleSystem />
```

#### 4. Theme Indicator
```typescript
import { ThemeIndicator } from '@/components/ui/ThemeToggle';

// Shows current theme status
<ThemeIndicator />
```

## CSS Classes

### Base Classes
The dark mode implementation uses Tailwind CSS's `dark:` prefix:

```css
/* Light mode (default) */
.bg-white
.text-gray-900

/* Dark mode */
.dark:bg-gray-800
.dark:text-gray-100
```

### Common Patterns

#### Backgrounds
```css
/* Cards and containers */
.bg-white dark:bg-gray-800
.bg-gray-50 dark:bg-gray-900
.bg-gray-100 dark:bg-gray-800

/* Overlays and modals */
.bg-white/80 dark:bg-gray-800/80
```

#### Text Colors
```css
/* Primary text */
.text-gray-900 dark:text-gray-100
.text-gray-800 dark:text-gray-200

/* Secondary text */
.text-gray-600 dark:text-gray-400
.text-gray-500 dark:text-gray-500

/* Muted text */
.text-gray-400 dark:text-gray-600
```

#### Borders
```css
/* Standard borders */
.border-gray-200 dark:border-gray-700
.border-gray-300 dark:border-gray-600

/* Subtle borders */
.border-gray-100 dark:border-gray-800
```

#### Interactive Elements
```css
/* Buttons */
.bg-primary-600 dark:bg-primary-500
.hover:bg-primary-700 dark:hover:bg-primary-600

/* Form inputs */
.bg-white dark:bg-gray-800
.border-gray-300 dark:border-gray-600
.focus:ring-primary-500 dark:focus:ring-primary-400
```

### Component-Specific Classes

#### Cards
```css
.card {
  @apply bg-white dark:bg-gray-800 
         border border-gray-200 dark:border-gray-700
         shadow-soft dark:shadow-soft-dark;
}
```

#### Buttons
```css
.btn-primary {
  @apply bg-gradient-to-r from-primary-600 to-primary-700 
         hover:from-primary-700 hover:to-primary-800
         focus:ring-primary-500 dark:focus:ring-primary-400;
}
```

#### Form Elements
```css
.input-field {
  @apply bg-white dark:bg-gray-800
         text-gray-900 dark:text-gray-100
         border-gray-300 dark:border-gray-600
         placeholder-gray-500 dark:placeholder-gray-400;
}
```

## Implementation Checklist

### ✅ Completed Components
- [x] ThemeProvider with system detection
- [x] Theme toggle components
- [x] Landing page (app/page.tsx)
- [x] Dashboard layout (app/dashboard/layout.tsx)
- [x] Dashboard header (components/dashboard/DashboardHeader.tsx)
- [x] Dashboard sidebar (components/dashboard/DashboardSidebar.tsx)
- [x] Dashboard main page (app/dashboard/page.tsx)
- [x] Login page (app/auth/login/page.tsx)
- [x] Register page (app/auth/register/page.tsx)
- [x] Global CSS styles (app/globals.css)

### 🔄 Components to Update
When adding new components, ensure they include dark mode classes:

1. **Backgrounds**: Always include `dark:bg-*` variants
2. **Text**: Include `dark:text-*` for all text elements
3. **Borders**: Add `dark:border-*` for borders
4. **Interactive states**: Include `dark:hover:*`, `dark:focus:*`
5. **Shadows**: Use `dark:shadow-*` variants

### 📝 Best Practices

#### 1. Consistent Color Palette
```css
/* Use these color combinations consistently */
.text-gray-900 dark:text-gray-100  /* Primary text */
.text-gray-600 dark:text-gray-400  /* Secondary text */
.bg-white dark:bg-gray-800         /* Primary background */
.bg-gray-50 dark:bg-gray-900       /* Secondary background */
```

#### 2. Accessibility
- Ensure sufficient contrast ratios in both themes
- Test with screen readers
- Maintain focus indicators in both themes

#### 3. Performance
- Use CSS custom properties for dynamic values
- Minimize JavaScript theme switching
- Leverage Tailwind's purge for unused styles

#### 4. Testing
- Test on different devices and browsers
- Verify system theme detection works
- Check theme persistence across sessions

## Troubleshooting

### Common Issues

#### 1. Flash of Unstyled Content (FOUC)
**Solution**: The ThemeProvider includes a loading state that prevents FOUC.

#### 2. Theme Not Persisting
**Solution**: Check localStorage for 'ribh-theme' key and ensure proper initialization.

#### 3. System Theme Not Detecting
**Solution**: Verify `window.matchMedia('(prefers-color-scheme: dark)')` is supported.

#### 4. Inconsistent Styling
**Solution**: Ensure all components use the established color patterns.

### Debug Mode
Add this to any component to debug theme state:

```typescript
const { theme, resolvedTheme } = useTheme();
console.log('Theme:', theme, 'Resolved:', resolvedTheme);
```

## Future Enhancements

### Planned Features
- [ ] Theme-aware images and icons
- [ ] Custom theme color schemes
- [ ] Theme-specific animations
- [ ] High contrast mode
- [ ] Reduced motion support

### Integration Points
- [ ] Email templates with theme support
- [ ] PDF generation with theme colors
- [ ] Mobile app theme synchronization
- [ ] Third-party integrations theme awareness

## Resources

- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [CSS Color Scheme Media Query](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/#contrast-minimum)

---

**Note**: This dark mode implementation is designed to be maintainable, accessible, and performant. Always test changes across different devices and user preferences. 