# Technology Stack

## Core Technologies

- **Frontend Framework**: Vue 3 with Composition API
- **Language**: TypeScript (strict mode enabled)
- **Build Tool**: Vite
- **UI Library**: Element Plus
- **State Management**: Pinia
- **Backend/Database**: Supabase (PostgreSQL)
- **Date Handling**: Day.js
- **Calendar Component**: FullCalendar

## Key Dependencies

```json
{
  "vue": "^3.5.24",
  "typescript": "~5.9.3",
  "element-plus": "^2.11.8",
  "pinia": "^3.0.4",
  "@supabase/supabase-js": "^2.84.0",
  "dayjs": "^1.11.19",
  "@fullcalendar/vue3": "^6.1.19",
  "chart.js": "^4.5.1",
  "vue-chartjs": "^5.3.3"
}
```

## Common Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production (runs type checking + build)
npm run build

# Preview production build
npm run preview

# Run tests (single run)
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Configuration

- **Path Alias**: `@/` maps to `src/`
- **Environment Variables**: Defined in `.env` (see `.env.example` for template)
  - `VITE_SUPABASE_URL`: Supabase project URL
  - `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
  - `VITE_LLM_API_KEY`: LLM API key
  - `VITE_LLM_API_ENDPOINT`: LLM API endpoint

## Build System

Vite is configured with:
- Vue plugin for SFC support
- Path aliases for clean imports
- TypeScript strict mode
- Production optimizations enabled by default
