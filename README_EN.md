# CalenParse - Smart Countdown Application

English | [中文](./README.md)

---

## 📅 Project Overview

CalenParse is a modern countdown and event management application built with Vue 3 + TypeScript, supporting both visitor and admin modes. It leverages AI Large Language Models (LLM) to automatically parse schedule information from text and quickly create countdown events. Visitors can experience core features for free, while administrators have full permissions and monitoring capabilities. Data is synchronized in real-time through Supabase PostgreSQL cloud database.

## 📸 Application Screenshots

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

### ✨ Core Features

#### Dual-Mode System
- 👥 **Visitor Mode** - No registration required, browser fingerprint-based, free core features
  - 1 LLM smart parsing quota
  - 3 event storage quota
  - Full countdown and management features
- 🔐 **Admin Mode** - Full permissions, no quota limits
  - Unlimited events and LLM calls
  - Visitor monitoring page
  - Data statistics and analysis

#### Core Functionality
- 🤖 **AI Smart Parsing** - Input any text, automatically extract schedule information
- ⏱️ **Countdown Display** - Real-time countdown to event start/end, supports past event counting
- 📋 **Multi-View Display** - Calendar view, list view, statistics analysis, monitoring page (admin)
- 🏷️ **Tag Management** - Add colored tags to events, categorize management, support multi-tag filtering
- 📝 **Template Feature** - Save common events as templates, quickly create new events
- 🔍 **Smart Search** - Support keyword, date range, location, tag multi-dimensional filtering
- 📤 **Import/Export** - Support JSON, iCal (.ics) format data import/export
- 🎨 **Theme Switching** - Light/dark mode, custom theme colors, cross-session persistence
- 📱 **Responsive Design** - Perfect adaptation for desktop, tablet, and mobile devices
- 📊 **Data Statistics** - Visualize event distribution, tag usage, and trend analysis
- 🔄 **Real-time Sync** - Cloud data storage based on Supabase, multi-device real-time sync

## 🚀 Quick Start

### Prerequisites

- Node.js >= 16.x
- npm >= 8.x
- Supabase account (free)

### 1. Clone the Project

```bash
git clone https://github.com/your-username/calenparse.git
cd calenparse
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Supabase Database

#### 3.1 Create Supabase Project

1. Visit [Supabase](https://supabase.com) and create a new project
2. Run all SQL statements from the `supabase-init.sql` file in the project's SQL Editor (create table structure and triggers)
3. Get the project URL and anon key (in Settings > API)
4. Create admin account: Add user in Supabase Dashboard's Authentication > Users

#### 3.2 Configure Environment Variables

1. Copy environment variable template:
```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

2. Edit the `.env` file and fill in the following configuration:

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# LLM API Configuration (Currently only supports Zhipu GLM)
VITE_LLM_API_KEY=your_llm_api_key
VITE_LLM_API_ENDPOINT=https://open.bigmodel.cn/api/paas/v4/chat/completions
# VITE_LLM_MODEL=glm-5
```

**Note**:
- All environment variables must start with `VITE_` to be accessible in the frontend
- LLM configuration is optional, you can still manually create events without it
- Do not commit the `.env` file to version control

### 4. Start Development Server

```bash
npm run dev
```

The application will start at `http://localhost:5173`.

**First-time Use:**
- The app automatically enters visitor mode, using FingerprintJS to generate a stable browser fingerprint
- Visitor mode quota: 1 LLM call + 3 event storage
- Click the "Login" button at the bottom of the sidebar to switch to admin mode (requires Supabase Auth account)
- Visitor data will be automatically cleaned after 30 days of inactivity

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
│   ├── components/          # Vue components (PascalCase naming)
│   │   ├── CalendarView.vue      # Calendar view (FullCalendar)
│   │   ├── ListView.vue          # List view (supports batch operations)
│   │   ├── StatisticsView.vue    # Statistics view (Chart.js)
│   │   ├── MonitoringPage.vue    # Monitoring page (admin only)
│   │   ├── EventDialog.vue       # Event edit dialog
│   │   ├── FloatingInput.vue     # Floating input box (ChatGPT style)
│   │   ├── PreviewDialog.vue     # LLM parsing result preview
│   │   ├── TagManager.vue        # Tag management
│   │   ├── TemplateManager.vue   # Template management
│   │   ├── ShareDialog.vue       # Share dialog
│   │   ├── ImportExport.vue      # Import/export
│   │   ├── ThemeSettings.vue     # Theme settings
│   │   ├── VisitorBanner.vue     # Visitor quota banner
│   │   ├── AdminLoginDialog.vue  # Admin login
│   │   ├── SearchBar.vue         # Search bar
│   │   ├── BatchOperationBar.vue # Batch operation bar
│   │   ├── BatchEditDialog.vue   # Batch edit dialog
│   │   ├── CountdownIndicator.vue# Countdown indicator
│   │   ├── ErrorState.vue        # Error state component
│   │   └── ...                   # Other components
│   ├── composables/         # Composable functions (useXxx.ts, logic with side effects)
│   │   ├── useAuth.ts            # Visitor/admin authentication (singleton pattern)
│   │   ├── useEvents.ts          # Event management (unified interface)
│   │   ├── useVisitorEvents.ts   # Visitor event management
│   │   ├── useSupabase.ts        # Supabase integration
│   │   ├── useLLM.ts             # LLM API integration
│   │   ├── useSearch.ts          # Search functionality
│   │   ├── useTheme.ts           # Theme management
│   │   ├── useMonitoring.ts      # Visitor monitoring (admin)
│   │   ├── useTags.ts            # Tag management
│   │   ├── useTemplates.ts       # Template management
│   │   └── useCountdown.ts       # Countdown calculation
│   ├── types/               # TypeScript type definitions (centralized in index.ts)
│   │   └── index.ts              # All shared type definitions
│   ├── utils/               # Utility functions (pure functions, no side effects)
│   │   ├── date.ts               # Date handling (Day.js)
│   │   ├── errorHandler.ts       # Error handling
│   │   ├── import-export.ts      # Import/export (JSON/iCal)
│   │   ├── animations.css        # Animation styles
│   │   ├── buttons.css           # Button styles
│   │   └── tags-badges.css       # Tag badge styles
│   ├── test/                # Test files
│   │   ├── date.test.ts          # Date utility tests
│   │   ├── countdown.test.ts     # Countdown tests
│   │   └── ...                   # Other tests
│   ├── App.vue              # Root component (minimalist sidebar layout)
│   ├── main.ts              # Application entry
│   └── style.css            # Global styles (CSS variables)
├── .kiro/                   # Kiro AI configuration
│   ├── specs/                    # Feature specification documents
│   └── steering/                 # AI guidance rules
│       ├── bms.md                # Global rules
│       ├── tech.md               # Tech stack specifications
│       ├── structure.md          # Project structure specifications
│       └── product.md            # Product specifications
├── assets/                  # Application screenshots
├── public/                  # Static assets
├── dist/                    # Build output (auto-generated)
├── supabase-init.sql        # Database initialization script
├── package.json             # Project configuration
├── vite.config.ts           # Vite configuration (path alias @/)
├── vitest.config.ts         # Vitest configuration
├── tsconfig.json            # TypeScript configuration (strict mode)
├── tsconfig.app.json        # Application TS configuration
├── tsconfig.node.json       # Node TS configuration
├── vercel.json              # Vercel deployment configuration
├── .env.example             # Environment variable template
└── README.md                # Project documentation
```

## 🎯 Core Features Explained

### 1. Dual-Mode System

#### Visitor Mode
- **Auto-initialization**: First visit automatically generates browser fingerprint (FingerprintJS), no registration required
- **Quota Limits**:
  - 1 LLM smart parsing (can still manually create events after exhausted)
  - 3 event storage (need to delete old events or upgrade to admin after exceeded)
- **Data Isolation**: Each visitor's data is independently stored in the `visitor_events` table, based on fingerprint recognition
- **Auto-cleanup**: Visitor data inactive for 30 days will be automatically cleaned (via database triggers)
- **Session Management**: `visitor_sessions` table records fingerprint, LLM usage count, token consumption, etc.

#### Admin Mode
- **Full Permissions**: No quota limits, unlimited events and LLM calls
- **Monitoring Page**: View all visitor sessions, LLM usage, event statistics, token consumption
- **Data Management**: Admin events stored in `events` table, completely isolated from visitor data
- **Authentication**: Login via Supabase Auth, supports email/password authentication
- **Mode Switching**: Can switch between visitor/admin modes anytime, data switches automatically

### 2. AI Smart Parsing

Enter any text containing schedule information in the floating input box, for example:

```
Tomorrow 3pm to 5pm project review meeting in Conference Room A
Team building activity all day next Monday
Christmas party on December 25, 2024
```

AI will automatically extract:
- Event title
- Start/end time (supports relative and absolute time)
- All-day event flag
- Location
- Description
- Related tags

**Technical Implementation**:
- Uses LLM API (OpenAI format) for natural language parsing
- Supports parsing multiple events simultaneously
- Parsing results confirmed in preview dialog before creation
- Automatically matches existing tags, does not auto-create new tags

**Quota Explanation**:
- Visitor mode: 1 free call (can still manually create events after exhausted)
- Admin mode: Unlimited
- Token consumption recorded in `visitor_sessions` table

### 3. Countdown Feature

- **Future Events**: Display "X days/hours/minutes until start"
- **Past Events**: Display "Expired X days ago" (count-up)
- **Ongoing Events**: Display "X days/hours/minutes until end"
- **Custom Units**: Can select default display unit in settings (days/hours/minutes)
- **Real-time Update**: Countdown updates in real-time, no page refresh needed
- **Smart Units**: Automatically selects appropriate display unit based on time length

**Technical Implementation**:
- Uses Day.js for date calculations
- `useCountdown` composable provides countdown calculation logic
- `CountdownIndicator` component handles display

### 4. Multi-View Management

- **Calendar View** - Month, week, day views, intuitive schedule display
- **List View** - List all events in chronological order, supports batch operations
- **Statistics View** - Charts showing event distribution, tag usage, etc.
- **Monitoring View** (Admin) - Visitor session monitoring, LLM usage statistics, event analysis

### 5. Tag System

- Create custom tags with color selection
- Add multiple tags to events
- Filter and analyze events by tags

### 6. Template Feature

- Save common events as templates
- Quickly create new events from templates
- Manage and edit template library

### 7. Search and Filtering

- Keyword search (title, description, location)
- Date range filtering
- Location filtering
- Tag filtering
- Multi-criteria combined filtering

### 8. Import/Export

- **Export Formats**: JSON, iCal (.ics)
- **Import Formats**: JSON, iCal (.ics)
- Supports batch import/export

### 9. Share Feature

- Generate event share images (html2canvas)
- Export as iCal file for sharing
- Supports selective sharing of multiple events


## 🎨 Theme Customization

The application supports light/dark mode switching and provides theme customization:

1. Click the theme toggle button at the bottom of the sidebar
2. Customize theme colors in settings
3. Theme configuration is automatically saved locally

## 📱 Responsive Design

- **Desktop** (>768px) - Sidebar navigation, spacious layout
- **Tablet** (768px-480px) - Bottom navigation bar, touch-optimized
- **Mobile** (<480px) - Compact layout, gesture-friendly

### FAQ

**Q: Supabase connection failed?**
- Check if `.env` file configuration is correct
- Confirm Supabase project is created and database tables are initialized (run `supabase-init.sql`)
- Check browser console for detailed error messages

**Q: What to do when visitor mode quota is exhausted?**
- After LLM quota is exhausted, can still manually create events
- After event quota is exhausted, can delete old events or contact admin for upgrade
- Admin mode has no quota limits

**Q: How to create admin account?**
- Add user in Supabase project's Authentication > Users
- Or use Supabase CLI: `supabase auth signup --email admin@example.com --password yourpassword`

**Q: LLM parsing not working?**
- Confirm `VITE_LLM_API_KEY` and `VITE_LLM_API_ENDPOINT` are configured
- Check if API key is valid
- In visitor mode, check if quota remains
- Check if network request is successful

**Q: How to customize LLM prompts?**
- Edit the prompt template in `src/composables/useLLM.ts`

**Q: Will visitor data be cleaned?**
- Visitor sessions and events inactive for 30 days will be automatically cleaned
- Admins can manually clean visitor data on the monitoring page

## 📄 License

[MIT License](LICENSE)

## 🤝 Contributing

Issues and Pull Requests are welcome!

### Contribution Guidelines

1. Fork this repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request
