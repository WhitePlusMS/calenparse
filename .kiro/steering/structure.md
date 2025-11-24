# Project Structure

## Directory Organization

```
src/
├── components/       # Vue single-file components (.vue)
├── composables/      # Composition API reusable logic
├── types/           # TypeScript type definitions and interfaces
│   └── index.ts     # Core type definitions
├── utils/           # Utility functions and helpers
│   ├── *.ts         # Utility functions
│   └── *.css        # Utility CSS (animations, buttons, tags-badges)
├── assets/          # Static assets (images, icons)
├── test/            # Test setup and configuration
├── App.vue          # Root component
├── main.ts          # Application entry point
└── style.css        # Global styles
```

## File Conventions

- **Components**: Use PascalCase for component files (e.g., `HelloWorld.vue`)
- **Composables**: Use camelCase with `use` prefix (e.g., `useCalendar.ts`)
- **Stores**: Use camelCase with descriptive names (e.g., `calendarStore.ts`)
- **Types**: Define shared types in `src/types/index.ts`
- **Utils**: Pure functions, no side effects

## Import Patterns

Use the `@/` alias for clean imports:
```typescript
import { SomeType } from '@/types'
import SomeComponent from '@/components/SomeComponent.vue'
import { useStore } from '@/stores/someStore'
```

## Component Structure

Vue components use `<script setup>` syntax with TypeScript:
```vue
<script setup lang="ts">
// Composition API logic here
</script>

<template>
  <!-- Template here -->
</template>

<style scoped>
/* Component-specific styles */
</style>
```

## State Management

- Use Pinia for global state
- Registered in `main.ts`
- Store files go in `src/stores/`

## Entry Point

`src/main.ts` initializes:
- Vue app instance
- Pinia state management
- Element Plus UI library
- Global styles
