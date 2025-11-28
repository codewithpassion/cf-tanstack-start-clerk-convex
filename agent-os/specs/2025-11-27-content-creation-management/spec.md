# Specification: Content Creation & Management

## Goal
Enable users to create AI-powered content through a guided wizard, edit content in a block-based editor with AI assistance, manage content versions, generate and attach images, and organize content through archive views with search and filtering capabilities.

## User Stories
- As a content creator, I want to generate AI drafts with my brand voice and persona so that content aligns with my established style
- As a content creator, I want to edit content in a rich editor with AI chat assistance so that I can refine drafts efficiently
- As a content creator, I want to view version history and restore previous versions so that I can track changes and recover content

## Specific Requirements

**Content Creation Wizard UI**
- Multi-step wizard flow: content type (category) selection, persona selection, brand voice selection, title/topic input, optional draft content textarea, source material upload, review screen
- Wizard state persists across steps with back navigation support
- Review screen displays all selections before generation with edit capability
- Reuse wizard pattern from `OnboardingWizard.tsx` for step indicators and navigation
- Mobile-responsive layout following existing wizard patterns

**AI SDK Integration**
- Integrate `@ai-sdk/openai` and `@ai-sdk/anthropic` packages for provider abstraction
- Create `src/lib/ai/` module with provider configuration and model selection
- Implement streaming response handler with progress indicator component
- Store API keys securely via Cloudflare Workers environment variables
- Model selection stored per-project with fallback to workspace default

**AI Draft Generation**
- Server function assembles context: category format guidelines, brand voice description, persona description, relevant knowledge base items, relevant examples
- Streaming LLM response rendered progressively in the UI
- Generated content saved as initial version in `contentPieces` table
- Error handling with retry option for failed generations
- Token usage tracking per generation for future billing

**Block-Based Markdown Editor**
- Integrate Novel editor package for Notion-style block editing
- Slash command menu for inserting headings, lists, code blocks, quotes, images
- Markdown shortcuts for inline formatting (bold, italic, links)
- Drag-and-drop block reordering within editor
- Autosave triggers after 3 seconds of inactivity using debounced mutation
- Responsive editor width with max-width constraint on large screens

**AI Chat Panel**
- Collapsible panel positioned to the right of editor (or bottom on mobile)
- Resizable width via drag handle with min/max constraints
- Chat history persisted per content piece in `contentChatMessages` table
- Context includes current editor content state for AI suggestions
- Quick action buttons: "Improve this paragraph", "Make it shorter", "Change tone"

**Version Control System**
- Automatic version creation on every save via `contentVersions` table
- Store complete content snapshot with timestamp and optional label
- Version list UI showing timestamps, with current version highlighted
- Limit display to 50 most recent versions with pagination for older

**Version Diff and Restore**
- Side-by-side or inline diff view comparing any two selected versions
- Visual highlighting for additions (green), deletions (red), modifications (yellow)
- Restore action creates new version from historical content (non-destructive)
- Diff computed client-side using text-diff library

**Content Finalization Workflow**
- `status` field on content pieces: `draft`, `finalized`
- Finalized versions tracked with `finalizedVersions` array (v1, v2, v3, etc.)
- Finalize action captures current content as numbered finalized version
- Finalized content read-only unless explicitly unlocked for editing
- Badge indicators showing finalization status in archive view

**Derived Content Creation**
- "Create Derived Content" action available on existing content pieces
- Target category selection with automatic format adaptation prompt
- Parent-child relationship stored via `parentContentId` field
- Derived content inherits persona and brand voice from parent
- Visual indicator showing lineage in content archive

**Image Prompt Wizard**
- Step-by-step wizard for generating image prompts
- Image type selection: infographic, illustration, photo, diagram
- Guided questions for subject, style, mood, composition, colors
- Generated prompt preview with manual editing before submission
- Save prompts as reusable templates in `imagePromptTemplates` table

**Image Generation Integration**
- Integrate DALL-E API via `@ai-sdk/openai` image generation
- Sequential generation: one image at a time with preview
- Generated images stored in R2 with reference in `contentImages` table
- Image selection UI with attach/discard actions per generated image
- Retry generation with modified prompt if result unsatisfactory

**Image Upload and Management**
- Direct upload to R2 with 15MB limit (consistent with existing file upload)
- Extend `FileUpload` component to support `contentPiece` owner type
- Image gallery view within editor showing attached images
- Reorder, caption editing, and delete functionality for attached images
- Image preview modal with zoom capability

**Content Archive View**
- Filterable list view at `/projects/$projectId/content`
- Filters: content type (category), persona, brand voice, date range picker, status (draft/finalized)
- Sortable columns: title, category, created date, updated date, status
- Pagination with configurable page size (10, 25, 50 items)
- Bulk actions: archive, delete (soft delete)

**Search Functionality**
- Search input in archive view header with instant results
- Full-text search across content title, content body
- Project-scoped search by default with option for cross-project search
- Search result highlighting with context snippets
- Debounced search input (300ms) to reduce query load

**Dashboard Enhancements**
- Recent activity feed showing last 10 content actions (created, edited, finalized)
- Quick action buttons: "Create Content" and "Create Project"
- Project overview cards display content count and recent activity timestamp
- Activity feed items link to relevant content piece

**Dark Mode Support**
- Theme toggle in header using `dark:` Tailwind CSS utilities
- Theme preference stored in localStorage with system preference fallback
- Theme context provider wrapping application for global state
- All existing and new components updated with dark mode variants
- Smooth transition animation between themes

## Existing Code to Leverage

**OnboardingWizard.tsx**
- Step indicator UI pattern with numbered circles and connector lines
- Multi-step state management with `useState` and step transitions
- Modal overlay pattern with non-dismissible backdrop
- Error handling and loading states during async operations
- Reuse for Content Creation Wizard and Image Prompt Wizard

**FileUpload.tsx**
- Drag-and-drop file upload with validation (15MB limit, allowed types)
- Upload progress tracking and error display
- R2 integration via `uploadFileFn` server function
- Extend owner types to include `contentPiece` and `contentImage`
- Image preview capability within upload zone

**convex/files.ts**
- File ownership verification pattern with `verifyFileOwnership` function
- File record creation with owner type discrimination
- Authorization pattern using `authorizeWorkspaceAccess`
- Extend for content piece and image ownership verification

**ProjectLayout.tsx**
- Sidebar navigation pattern with project context
- Content area with loading and error states
- Add "Content" navigation item to sidebar
- Reuse layout for content editor with optional AI panel

**convex/lib/auth.ts**
- `authorizeWorkspaceAccess` function for all authenticated mutations/queries
- User and workspace retrieval from Clerk identity
- Pattern to follow for all new Convex functions

## Out of Scope
- Real-time collaborative editing (multi-user simultaneous editing)
- Content scheduling and publishing automation
- External platform integrations (LinkedIn, Twitter API posting)
- Content analytics and performance tracking
- AI model fine-tuning or custom model training
- Batch content generation (multiple pieces at once)
- Content approval workflows with multiple reviewers
- Export to external formats (PDF, DOCX, HTML)
- SEO optimization tools and keyword analysis
- Plagiarism detection or content originality checking
- Comment/annotation system on content pieces
- Content templates beyond category format guidelines
- Video or audio content generation
- Webhook integrations for external notifications

---

## Technical Design

### Convex Schema

The following tables will be added to `convex/schema.ts`:

```typescript
// Content Pieces - the main content entity
contentPieces: defineTable({
  projectId: v.id("projects"),
  categoryId: v.id("categories"),
  personaId: v.optional(v.id("personas")),
  brandVoiceId: v.optional(v.id("brandVoices")),
  parentContentId: v.optional(v.id("contentPieces")), // For derived content
  title: v.string(),
  content: v.string(), // JSON string from Novel editor
  status: v.union(v.literal("draft"), v.literal("finalized")),
  currentFinalizedVersion: v.optional(v.number()), // v1, v2, v3, etc.
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_projectId", ["projectId"])
  .index("by_projectId_status", ["projectId", "status"])
  .index("by_projectId_categoryId", ["projectId", "categoryId"])
  .index("by_projectId_deletedAt", ["projectId", "deletedAt"])
  .index("by_parentContentId", ["parentContentId"]),

// Content Versions - version history for each content piece
contentVersions: defineTable({
  contentPieceId: v.id("contentPieces"),
  versionNumber: v.number(), // Sequential version number
  content: v.string(), // JSON string snapshot
  label: v.optional(v.string()), // Optional version label
  isFinalizedVersion: v.boolean(), // Whether this is a finalized milestone
  finalizedVersionNumber: v.optional(v.number()), // v1, v2, v3 if finalized
  createdAt: v.number(),
})
  .index("by_contentPieceId", ["contentPieceId"])
  .index("by_contentPieceId_versionNumber", ["contentPieceId", "versionNumber"]),

// Content Chat Messages - AI chat history per content piece
contentChatMessages: defineTable({
  contentPieceId: v.id("contentPieces"),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  createdAt: v.number(),
})
  .index("by_contentPieceId", ["contentPieceId"]),

// Content Images - images attached to content pieces
contentImages: defineTable({
  contentPieceId: v.id("contentPieces"),
  fileId: v.id("files"), // Reference to files table
  caption: v.optional(v.string()),
  sortOrder: v.number(),
  generatedPrompt: v.optional(v.string()), // If AI-generated
  createdAt: v.number(),
})
  .index("by_contentPieceId", ["contentPieceId"]),

// Image Prompt Templates - reusable AI image prompts
imagePromptTemplates: defineTable({
  projectId: v.id("projects"),
  name: v.string(),
  imageType: v.union(
    v.literal("infographic"),
    v.literal("illustration"),
    v.literal("photo"),
    v.literal("diagram")
  ),
  promptTemplate: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_projectId", ["projectId"]),

// Activity Log - for dashboard activity feed
activityLog: defineTable({
  workspaceId: v.id("workspaces"),
  projectId: v.id("projects"),
  contentPieceId: v.optional(v.id("contentPieces")),
  action: v.union(
    v.literal("content_created"),
    v.literal("content_edited"),
    v.literal("content_finalized"),
    v.literal("content_deleted"),
    v.literal("project_created"),
    v.literal("derived_content_created")
  ),
  metadata: v.optional(v.string()), // JSON string for additional data
  createdAt: v.number(),
})
  .index("by_workspaceId", ["workspaceId"])
  .index("by_projectId", ["projectId"])
  .index("by_workspaceId_createdAt", ["workspaceId", "createdAt"]),
```

### Update to Existing Schema

Update the `files` table to support content piece and content image ownership:

```typescript
files: defineTable({
  // Existing ownership fields
  brandVoiceId: v.optional(v.id("brandVoices")),
  personaId: v.optional(v.id("personas")),
  knowledgeBaseItemId: v.optional(v.id("knowledgeBaseItems")),
  exampleId: v.optional(v.id("examples")),
  // New ownership fields
  contentPieceId: v.optional(v.id("contentPieces")), // Source material uploads
  contentImageId: v.optional(v.id("contentImages")), // Attached images
  // File metadata (unchanged)
  filename: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
  r2Key: v.string(),
  extractedText: v.optional(v.string()),
  createdAt: v.number(),
})
  // Existing indexes...
  .index("by_contentPieceId", ["contentPieceId"])
  .index("by_contentImageId", ["contentImageId"]),
```

Update the `projects` table to support AI model preferences:

```typescript
projects: defineTable({
  // Existing fields...
  workspaceId: v.id("workspaces"),
  name: v.string(),
  description: v.optional(v.string()),
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
  // New AI configuration fields
  defaultAiProvider: v.optional(v.union(v.literal("openai"), v.literal("anthropic"))),
  defaultAiModel: v.optional(v.string()), // e.g., "gpt-4o", "claude-3-5-sonnet"
})
```

Update the `workspaces` table for theme preference:

```typescript
workspaces: defineTable({
  // Existing fields...
  userId: v.id("users"),
  onboardingCompleted: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  // New fields
  themePreference: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
})
```

---

## API Design

### Convex Queries

```typescript
// contentPieces.ts
listContentPieces: query({ projectId, filters?, pagination? }) // List with filters
getContentPiece: query({ contentPieceId }) // Single content piece
getContentPieceWithRelations: query({ contentPieceId }) // With category, persona, brandVoice
getDerivedContent: query({ parentContentId }) // Child content pieces
getContentStats: query({ projectId }) // Counts by status, category

// contentVersions.ts
listVersions: query({ contentPieceId, limit?, offset? }) // Version history
getVersion: query({ versionId }) // Single version
getFinalizedVersions: query({ contentPieceId }) // Only finalized versions

// contentChatMessages.ts
listChatMessages: query({ contentPieceId }) // Chat history

// contentImages.ts
listContentImages: query({ contentPieceId }) // Attached images

// imagePromptTemplates.ts
listImagePromptTemplates: query({ projectId }) // Saved templates

// activityLog.ts
getRecentActivity: query({ workspaceId, limit? }) // Dashboard feed
getProjectActivity: query({ projectId, limit? }) // Project-specific activity

// search.ts
searchContent: query({ projectId?, query, limit? }) // Full-text search
```

### Convex Mutations

```typescript
// contentPieces.ts
createContentPiece: mutation({ projectId, categoryId, personaId?, brandVoiceId?, title, content })
updateContentPiece: mutation({ contentPieceId, title?, content? })
deleteContentPiece: mutation({ contentPieceId }) // Soft delete
finalizeContentPiece: mutation({ contentPieceId }) // Mark as finalized
unfinalizeContentPiece: mutation({ contentPieceId }) // Unlock for editing
createDerivedContent: mutation({ parentContentId, categoryId, title })

// contentVersions.ts
createVersion: mutation({ contentPieceId, content, label? }) // Called on save
restoreVersion: mutation({ versionId }) // Creates new version from old

// contentChatMessages.ts
addChatMessage: mutation({ contentPieceId, role, content })
clearChatHistory: mutation({ contentPieceId })

// contentImages.ts
attachImage: mutation({ contentPieceId, fileId, caption?, generatedPrompt? })
updateImageCaption: mutation({ contentImageId, caption })
reorderImages: mutation({ contentPieceId, imageIds }) // Update sortOrder
detachImage: mutation({ contentImageId })

// imagePromptTemplates.ts
createImagePromptTemplate: mutation({ projectId, name, imageType, promptTemplate })
updateImagePromptTemplate: mutation({ templateId, name?, promptTemplate? })
deleteImagePromptTemplate: mutation({ templateId })

// activityLog.ts
logActivity: mutation({ projectId, contentPieceId?, action, metadata? })

// workspaces.ts (update existing)
updateThemePreference: mutation({ themePreference })

// projects.ts (update existing)
updateAiSettings: mutation({ projectId, defaultAiProvider?, defaultAiModel? })
```

### Server Functions (TanStack Start)

```typescript
// AI Generation
generateDraft: createServerFn({ method: 'POST' })
  // Input: { contentPieceId, categoryId, personaId?, brandVoiceId?, title, topic, draftContent? }
  // Assembles context, calls LLM, streams response
  // Returns: streaming text response

generateChatResponse: createServerFn({ method: 'POST' })
  // Input: { contentPieceId, message, currentContent }
  // Context-aware AI chat response
  // Returns: streaming text response

generateImagePrompt: createServerFn({ method: 'POST' })
  // Input: { imageType, subject, style, mood, composition, colors }
  // Returns: { prompt: string }

generateImage: createServerFn({ method: 'POST' })
  // Input: { prompt, size? }
  // Calls DALL-E API, uploads to R2
  // Returns: { fileId, r2Key, previewUrl }

// Context Assembly
assembleGenerationContext: createServerFn({ method: 'GET' })
  // Input: { categoryId, personaId?, brandVoiceId?, projectId }
  // Returns: { formatGuidelines, personaDescription, brandVoiceDescription, examples[], knowledgeBase[] }
```

---

## Data Models

### TypeScript Types

```typescript
// Content Piece
type ContentPiece = {
  _id: Id<"contentPieces">;
  projectId: Id<"projects">;
  categoryId: Id<"categories">;
  personaId?: Id<"personas">;
  brandVoiceId?: Id<"brandVoices">;
  parentContentId?: Id<"contentPieces">;
  title: string;
  content: string; // Novel editor JSON
  status: "draft" | "finalized";
  currentFinalizedVersion?: number;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
};

// Content Version
type ContentVersion = {
  _id: Id<"contentVersions">;
  contentPieceId: Id<"contentPieces">;
  versionNumber: number;
  content: string;
  label?: string;
  isFinalizedVersion: boolean;
  finalizedVersionNumber?: number;
  createdAt: number;
};

// Content Chat Message
type ContentChatMessage = {
  _id: Id<"contentChatMessages">;
  contentPieceId: Id<"contentPieces">;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

// Content Image
type ContentImage = {
  _id: Id<"contentImages">;
  contentPieceId: Id<"contentPieces">;
  fileId: Id<"files">;
  caption?: string;
  sortOrder: number;
  generatedPrompt?: string;
  createdAt: number;
};

// Image Prompt Template
type ImagePromptTemplate = {
  _id: Id<"imagePromptTemplates">;
  projectId: Id<"projects">;
  name: string;
  imageType: "infographic" | "illustration" | "photo" | "diagram";
  promptTemplate: string;
  createdAt: number;
  updatedAt: number;
};

// Activity Log Entry
type ActivityLogEntry = {
  _id: Id<"activityLog">;
  workspaceId: Id<"workspaces">;
  projectId: Id<"projects">;
  contentPieceId?: Id<"contentPieces">;
  action: "content_created" | "content_edited" | "content_finalized" |
          "content_deleted" | "project_created" | "derived_content_created";
  metadata?: string;
  createdAt: number;
};

// AI Provider Configuration
type AiProviderConfig = {
  provider: "openai" | "anthropic";
  model: string;
  apiKey: string; // Retrieved from env
};

// Theme Preference
type ThemePreference = "light" | "dark" | "system";

// Content Archive Filters
type ContentFilters = {
  categoryId?: Id<"categories">;
  personaId?: Id<"personas">;
  brandVoiceId?: Id<"brandVoices">;
  status?: "draft" | "finalized";
  dateFrom?: number;
  dateTo?: number;
  searchQuery?: string;
};
```

---

## Validation Rules

| Entity | Field | Required | Max Length | Additional Rules |
|--------|-------|----------|------------|------------------|
| ContentPiece | title | Yes | 200 chars | Non-empty after trim |
| ContentPiece | content | Yes | 500,000 chars | Valid Novel JSON |
| ContentVersion | content | Yes | 500,000 chars | Valid Novel JSON |
| ContentVersion | label | No | 100 chars | - |
| ContentChatMessage | content | Yes | 10,000 chars | Non-empty |
| ContentImage | caption | No | 500 chars | - |
| ImagePromptTemplate | name | Yes | 100 chars | Non-empty after trim |
| ImagePromptTemplate | promptTemplate | Yes | 2,000 chars | Non-empty |
| ActivityLog | metadata | No | 5,000 chars | Valid JSON |

**AI Generation Limits:**
- Maximum context length: 100,000 tokens (combined)
- Maximum knowledge base items: 10 per generation
- Maximum examples: 5 per generation
- Image generation prompt: 4,000 chars max

---

## Security Considerations

**Authorization:**
- All content operations require workspace ownership verification
- Content pieces are project-scoped; verify project belongs to user's workspace
- Derived content creation requires ownership of parent content
- Image generation requires valid project access

**AI API Key Security:**
- API keys stored in Cloudflare Workers environment variables
- Never expose keys to client-side code
- All AI calls go through server functions

**Content Access:**
- Soft-deleted content excluded from all queries
- Version history only accessible by content owner
- Search limited to user's workspace scope

**Rate Limiting:**
- AI generation: 10 requests per minute per user
- Image generation: 5 requests per minute per user
- Chat messages: 30 per minute per user

---

## Dependencies

### New NPM Packages

```json
{
  "ai": "^4.x",                    // Vercel AI SDK core
  "@ai-sdk/openai": "^1.x",        // OpenAI provider
  "@ai-sdk/anthropic": "^1.x",     // Anthropic provider
  "novel": "^1.x",                 // Notion-style editor
  "diff": "^7.x",                  // Text diff for version comparison
  "date-fns": "^4.x"               // Date formatting for activity feed
}
```

### Environment Variables (New)

```env
# AI Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Default AI settings
DEFAULT_AI_PROVIDER=openai
DEFAULT_AI_MODEL=gpt-4o
```

---

## Routes Structure

```
src/routes/_authed/
  ├── dashboard.tsx                          # Enhanced with activity feed
  └── projects.$projectId/
      ├── content.tsx                        # Content archive view
      ├── content.new.tsx                    # Content creation wizard
      ├── content.$contentId.tsx             # Content editor with AI panel
      ├── content.$contentId.versions.tsx    # Version history view
      └── content.$contentId.images.tsx      # Image management
```

---

## Component Structure

```
src/components/
  ├── content/
  │   ├── ContentCreationWizard.tsx          # Multi-step wizard
  │   ├── ContentEditor.tsx                  # Novel editor wrapper
  │   ├── ContentEditorLayout.tsx            # Editor + AI panel layout
  │   ├── AIChatPanel.tsx                    # Collapsible chat sidebar
  │   ├── VersionHistory.tsx                 # Version list component
  │   ├── VersionDiff.tsx                    # Diff viewer component
  │   ├── ContentArchiveList.tsx             # Archive table/list
  │   ├── ContentFilters.tsx                 # Filter controls
  │   ├── ContentCard.tsx                    # Card for archive view
  │   └── FinalizeDialog.tsx                 # Finalization confirmation
  ├── images/
  │   ├── ImagePromptWizard.tsx              # Image prompt generator
  │   ├── ImageGenerationPreview.tsx         # Generated image preview
  │   ├── ImageGallery.tsx                   # Attached images gallery
  │   └── ImageUploader.tsx                  # Direct upload component
  ├── dashboard/
  │   ├── ActivityFeed.tsx                   # Recent activity list
  │   └── QuickActions.tsx                   # Action buttons
  ├── theme/
  │   ├── ThemeProvider.tsx                  # Theme context
  │   └── ThemeToggle.tsx                    # Light/dark toggle
  └── derived/
      └── DerivedContentDialog.tsx           # Create derived content modal
```

---

## Visual Design

**Content Editor Layout:**
- Main editor area: 60-70% width on desktop
- AI Chat Panel: 30-40% width, collapsible
- Mobile: Full-width editor, chat panel slides from bottom
- Sticky toolbar at top of editor

**Version History:**
- Sidebar panel or modal view
- Timeline visualization with version dots
- Current version highlighted
- Finalized versions marked with badge

**Content Archive:**
- Table view with sortable columns
- Card view option for visual preference
- Sticky filter bar at top
- Pagination at bottom

**Dark Mode:**
- Preserve accent colors (cyan theme)
- Dark backgrounds: slate-900, slate-800
- Light text: slate-100, slate-200
- Maintain contrast ratios for accessibility
