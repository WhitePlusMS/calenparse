# CalenParse - Smart Calendar Parser

English | [中文](./README.md)

---

## 📅 Project Overview

CalenParse (Smart Calendar Parser) is a modern frontend calendar management application that automatically parses schedule information from text using AI Large Language Models (LLM) to quickly create calendar events. Say goodbye to manual input and let AI manage your schedule!

## 📸 Screenshots

<div align="center">
  <img src="./assets/主界面.png" alt="Main Interface" width="800"/>
  <p><em>Main Interface - Calendar View</em></p>
</div>

<div align="center">
  <img src="./assets/列表界面.png" alt="List View" width="800"/>
  <p><em>List View - Batch Event Management</em></p>
</div>

<div align="center">
  <img src="./assets/事件详情.png" alt="Event Details" width="800"/>
  <p><em>Event Details - Edit and Manage</em></p>
</div>

<div align="center">
  <img src="./assets/标签管理.png" alt="Tag Management" width="800"/>
  <p><em>Tag Management - Categorize and Organize</em></p>
</div>

<div align="center">
  <img src="./assets/主题设置.png" alt="Theme Settings" width="800"/>
  <p><em>Theme Settings - Personalization</em></p>
</div>

<div align="center">
  <img src="./assets/分享为图片.png" alt="Share as Image" width="800"/>
  <p><em>Share Feature - Export and Share</em></p>
</div>

### ✨ Key Features

- 🤖 **AI Smart Parsing** - Input any text, automatically extract schedule information
- 📋 **Multiple Views** - Calendar view, list view, and statistics analysis
- 🏷️ **Tag Management** - Add colorful tags to events for categorization
- 📝 **Template System** - Save common events as templates for quick creation
- 🔍 **Smart Search** - Multi-dimensional filtering by keyword, date range, location, and tags
- 📤 **Import/Export** - Support for JSON and iCal format data import/export
- 🎨 **Theme Switching** - Light/dark mode with custom theme colors
- 📱 **Responsive Design** - Perfect adaptation for desktop, tablet, and mobile devices
- ⏱️ **Countdown Reminders** - Real-time display of event start/end countdowns
- 📊 **Data Statistics** - Visual display of event distribution and trends

## 🛠️ Tech Stack

### Core Framework
- **Vue 3** - Progressive JavaScript framework (Composition API)
- **TypeScript** - Type-safe JavaScript superset
- **Vite** - Next-generation frontend build tool

### UI & Styling
- **Element Plus** - Enterprise-level Vue 3 component library
- **FullCalendar** - Powerful calendar component
- **Chart.js** - Flexible charting library

### State & Data
- **Pinia** - Official Vue 3 state management library
- **Supabase** - Open-source Firebase alternative (PostgreSQL)
- **Day.js** - Lightweight date manipulation library

### Testing
- **Vitest** - Vite-based unit testing framework
- **fast-check** - Property-based testing library

## 🚀 Quick Start

### Prerequisites

- Node.js >= 16.x
- npm >= 8.x
- Supabase account (free)

### 1. Clone the Project

```bash
git clone <repository-url>
cd calenparse
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Supabase Database

#### 3.1 Create Supabase Project

1. Visit [Supabase](https://supabase.com) and create a new project
2. Run the SQL statements from `supabase-schema.sql` in the project's SQL Editor
3. Get the project URL and anon key (in Settings > API)

#### 3.2 Configure Environment Variables

1. Copy the environment variable template:
```bash
copy .env.example .env
```

2. Edit the `.env` file and fill in the following configuration:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# LLM API Configuration (for smart parsing)
VITE_LLM_API_KEY=your_llm_api_key
VITE_LLM_API_ENDPOINT=your_llm_api_endpoint
```

### 4. Start Development Server

```bash
npm run dev
```

The application will start at `http://localhost:5173`. It will automatically test the Supabase connection on startup.

### 5. Build for Production

```bash
npm run build
```

Build artifacts will be output to the `dist` directory.

### 6. Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
calenparse/
├── src/
│   ├── components/          # Vue components
│   │   ├── CalendarView.vue      # Calendar view
│   │   ├── ListView.vue          # List view
│   │   ├── StatisticsView.vue    # Statistics view
│   │   ├── EventDialog.vue       # Event edit dialog
│   │   ├── FloatingInput.vue     # Floating input box
│   │   ├── PreviewDialog.vue     # Preview dialog
│   │   ├── TagManager.vue        # Tag management
│   │   ├── TemplateManager.vue   # Template management
│   │   └── ...                   # Other components
│   ├── composables/         # Composable functions (business logic)
│   │   ├── useEvents.ts          # Event management
│   │   ├── useSupabase.ts        # Supabase integration
│   │   ├── useLLM.ts             # LLM API integration
│   │   ├── useSearch.ts          # Search functionality
│   │   ├── useTheme.ts           # Theme management
│   │   └── ...                   # Other logic
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts              # Core types
│   ├── utils/               # Utility functions
│   │   ├── date.ts               # Date handling
│   │   ├── errorHandler.ts       # Error handling
│   │   ├── import-export.ts      # Import/export
│   │   └── ...                   # Other utilities
│   ├── test/                # Test files
│   ├── App.vue              # Root component
│   ├── main.ts              # Application entry
│   └── style.css            # Global styles
├── .kiro/                   # Kiro AI configuration
│   ├── specs/                    # Feature specifications
│   └── steering/                 # AI guidance rules
├── public/                  # Static assets
├── dist/                    # Build output (auto-generated)
├── supabase-schema.sql      # Database schema
├── package.json             # Project configuration
├── vite.config.ts           # Vite configuration
├── vitest.config.ts         # Vitest configuration
└── tsconfig.json            # TypeScript configuration
```

## 🎯 Core Features Explained

### 1. AI Smart Parsing

Input any text containing schedule information in the floating input box, for example:

```
Project review meeting tomorrow from 3 PM to 5 PM in Conference Room A
Team building activity all day next Monday
```

AI will automatically extract:
- Event title
- Start/end time
- Location
- Description
- Related tags

### 2. Multi-View Management

- **Calendar View** - Month, week, day views for intuitive schedule display
- **List View** - All events listed chronologically with batch operations support
- **Statistics View** - Charts showing event distribution, tag usage, etc.

### 3. Tag System

- Create custom tags with color selection
- Add multiple tags to events
- Filter and analyze events by tags

### 4. Template System

- Save common events as templates
- Quickly create new events from templates
- Manage and edit template library

### 5. Search & Filter

- Keyword search (title, description, location)
- Date range filtering
- Location filtering
- Tag filtering
- Multi-criteria combined filtering

### 6. Import/Export

- **Export formats**: JSON, iCal (.ics)
- **Import formats**: JSON, iCal (.ics)
- Support for batch import/export

### 7. Sharing

- Generate event sharing links
- Export as iCal files for sharing
- Support selective sharing of multiple events

## 🧪 Testing

### Run Tests

```bash
# Run all tests once
npm run test

# Watch mode (for development)
npm run test:watch

# Run tests with UI interface
npm run test:ui
```

### Test Coverage

The project includes:
- Unit tests - Test independent functions and components
- Property tests - Property-based testing using fast-check
- Integration tests - Test component interactions

## 🎨 Theme Customization

The application supports light/dark mode switching and theme customization:

1. Click the theme toggle button at the bottom of the sidebar
2. Customize theme colors in settings
3. Theme configuration is automatically saved locally

## 📱 Responsive Design

- **Desktop** (>768px) - Sidebar navigation, spacious layout
- **Tablet** (768px-480px) - Bottom navigation bar, touch-optimized
- **Mobile** (<480px) - Compact layout, gesture-friendly

## 🔧 Development Guide

### Code Standards

- Use TypeScript strict mode
- Follow Vue 3 Composition API best practices
- Components use `<script setup>` syntax
- Use `@/` path alias for module imports

### Adding New Features

1. Create feature specification document in `.kiro/specs/`
2. Add Vue components in `src/components/`
3. Add business logic in `src/composables/`
4. Define TypeScript types in `src/types/`
5. Write unit tests and property tests

### Common Issues

**Q: Supabase connection failed?**
- Check if `.env` file configuration is correct
- Confirm Supabase project is created and database tables are initialized
- Check browser console for detailed error messages

**Q: LLM parsing not working?**
- Confirm `VITE_LLM_API_KEY` and `VITE_LLM_API_ENDPOINT` are configured
- Check if API key is valid
- Verify network requests are successful

**Q: How to customize LLM prompts?**
- Edit the prompt template in `src/composables/useLLM.ts`

## 📄 License

[MIT License](LICENSE)

## 🤝 Contributing

Issues and Pull Requests are welcome!
