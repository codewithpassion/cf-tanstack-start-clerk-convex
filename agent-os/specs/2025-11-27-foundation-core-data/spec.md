# Specification: Foundation & Core Data

## Goal

Establish the foundational data layer and core data management features for PostMate, including the complete Convex database schema, workspace/project management, category management, brand voice and persona systems, knowledge base and examples library, and reusable file upload infrastructure with Cloudflare R2 storage.

## User Stories

- As a new user, I want my workspace to be automatically created when I sign up so that I can immediately start organizing my content projects (US-001)
- As a user, I want to create and manage multiple projects so that I can organize content for different brands or purposes (US-007, US-008, US-009, US-010)
- As a user, I want to be guided through creating my first project during onboarding so that I can start using the platform immediately (US-002, US-003, US-004)

## Specific Requirements

**Workspace Auto-Creation on Sign-Up**
- Extend existing `syncUser` mutation to create workspace when user is first synced from Clerk
- 1:1 relationship between user and workspace (no workspace switching or sharing)
- Workspace stores `onboardingCompleted` flag to track wizard completion
- Link workspace to user via `userId` field referencing users table

**Project CRUD Operations**
- Create projects with name (required, max 100 chars) and description (optional, max 2000 chars)
- Soft delete projects using `deletedAt` timestamp field
- All project queries must filter out soft-deleted records
- Projects belong to a single workspace via `workspaceId` field
- Include `createdAt` and `updatedAt` timestamps on all records

**Default Category Population**
- Automatically create 6 default categories when a new project is created
- Categories are project-scoped (not workspace-level)
- Default categories: Blog Post, LinkedIn Article, LinkedIn Post, Instagram Post, X Thread, Case Study
- Each default category includes format guidelines (character limits, structure recommendations)
- Custom categories can be added with name (required, max 50 chars) and description (optional, max 2000 chars)

**Brand Voice Management**
- CRUD operations for brand voices per project
- Support both document uploads and direct text input for voice definition
- Extract text from uploaded documents server-side during upload
- Store extracted text in `extractedText` field for AI context injection
- Soft delete support with `deletedAt` timestamp

**Persona Management**
- CRUD operations for personas per project
- Support document uploads and free-text descriptions
- Extract text from uploaded documents server-side during upload
- Store extracted text for AI consumption
- Soft delete support with `deletedAt` timestamp

**Knowledge Base Per Category**
- Store reference materials per category (not project-level)
- Support file uploads (Word, PDF, text, images up to 15MB)
- Support free-text entries with title and content fields
- Extract text from documents server-side and store for AI context
- Soft delete support with `deletedAt` timestamp

**Examples Library Per Category**
- Store successful content samples per category for style imitation
- Support file uploads and direct text input
- Include title and optional notes fields
- Soft delete support with `deletedAt` timestamp

**File Upload Infrastructure**
- Reusable file upload component for use across brand voices, personas, knowledge base, examples
- 15MB file size limit enforced client-side and server-side
- Support Word (.doc, .docx), PDF (.pdf), text (.txt), and image formats (jpg, png, gif, webp)
- Store files in Cloudflare R2 with presigned URLs for secure access
- Track file metadata in Convex (filename, size, mimeType, r2Key, extractedText)

**Onboarding Wizard Flow**
- Multi-step wizard modal for first-time users
- Steps: Create project -> Add brand voice (optional skip) -> Add persona (optional skip) -> Complete
- Mark workspace `onboardingCompleted` when wizard finishes or is skipped
- Show wizard only when `onboardingCompleted` is false

**Project Dashboard UI**
- Grid layout of project cards showing name, description preview, content count, last updated
- "Create new project" prominent action button
- Empty state with helpful guidance when no projects exist
- Click project card to enter project workspace

## Visual Design

No visual assets were provided. Implementation will follow standard patterns:

**Dashboard Layout**
- Responsive grid of project cards (1 column mobile, 2 tablet, 3 desktop)
- Card shows project name, truncated description, metadata badges
- Hover state reveals quick actions
- Empty state with illustration and CTA button

**Project Workspace Layout**
- Left sidebar navigation with sections: Categories, Brand Voices, Personas, Knowledge Base, Examples
- Main content area displays selected section
- Gear icon in header for project settings
- Breadcrumb navigation showing workspace -> project path

**Onboarding Wizard**
- Modal overlay with step indicator (dots or progress bar)
- Single form per step with clear labels and validation
- Skip link visible on optional steps
- Confirmation screen on completion

## Existing Code to Leverage

**Convex Users Table and Sync Pattern (`convex/schema.ts`, `convex/users.ts`)**
- Existing users table schema with `clerkId`, timestamps, and indexes
- `syncUser` mutation pattern for Clerk integration - extend to create workspace
- Query patterns using `withIndex` for efficient lookups
- Mutation patterns with `ctx.db.insert`, `ctx.db.patch`, `ctx.db.delete`

**Protected Route Layout (`src/routes/_authed.tsx`)**
- Authentication check pattern using `createServerFn` with `auth()` from Clerk
- `beforeLoad` hook for route-level auth enforcement
- Redirect to sign-in pattern for unauthenticated users
- Extend this pattern for all project and workspace routes

**Convex React Integration (`src/lib/convex.tsx`)**
- `ConvexProviderWithClerk` setup for authenticated Convex access
- Use `useQuery` and `useMutation` hooks for data fetching
- Existing auth context available via `useAuth` from Clerk

**Header Component (`src/components/Header.tsx`)**
- Existing header structure to extend with project navigation
- User menu pattern with Clerk `UserButton`

## Out of Scope

- Activity feed / recent activity tracking (explicitly deferred to later phase)
- Team/shared workspaces and multi-user collaboration
- Workspace switching functionality
- Hard delete functionality (only soft deletes implemented)
- Content creation wizard (separate spec - roadmap item 9)
- AI integration and draft generation (separate spec - roadmap items 10-11)
- Rich text editor integration (separate spec - roadmap item 12)
- Version control system (separate spec - roadmap item 14)
- Content finalization workflow (separate spec - roadmap item 16)
- Derived content creation (separate spec - roadmap item 17)
- Image generation (separate spec - roadmap items 18-20)
- Content archive view with filtering (separate spec - roadmap item 21)
- Search functionality (separate spec - roadmap item 22)
- Dark mode toggle (separate spec - roadmap item 24)

---

## Technical Design

### Convex Schema

The following tables will be added to `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Existing users table (preserve)
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    clerkId: v.string(),
    imageUrl: v.optional(v.string()),
    roles: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_clerkId", ["clerkId"]),

  // Workspaces - 1:1 with users
  workspaces: defineTable({
    userId: v.id("users"),
    onboardingCompleted: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  // Projects - belong to workspace
  projects: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_deletedAt", ["workspaceId", "deletedAt"]),

  // Categories - belong to project
  categories: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    formatGuidelines: v.optional(v.string()),
    isDefault: v.boolean(),
    sortOrder: v.number(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_deletedAt", ["projectId", "deletedAt"]),

  // Brand Voices - belong to project
  brandVoices: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_deletedAt", ["projectId", "deletedAt"]),

  // Personas - belong to project
  personas: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_deletedAt", ["projectId", "deletedAt"]),

  // Knowledge Base Items - belong to category
  knowledgeBaseItems: defineTable({
    categoryId: v.id("categories"),
    projectId: v.id("projects"), // Denormalized for easier querying
    title: v.string(),
    content: v.optional(v.string()), // For free-text entries
    fileId: v.optional(v.id("files")), // For file uploads
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_categoryId", ["categoryId"])
    .index("by_categoryId_deletedAt", ["categoryId", "deletedAt"])
    .index("by_projectId", ["projectId"]),

  // Examples - belong to category
  examples: defineTable({
    categoryId: v.id("categories"),
    projectId: v.id("projects"), // Denormalized for easier querying
    title: v.string(),
    content: v.optional(v.string()), // For text entries
    notes: v.optional(v.string()),
    fileId: v.optional(v.id("files")), // For file uploads
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_categoryId", ["categoryId"])
    .index("by_categoryId_deletedAt", ["categoryId", "deletedAt"])
    .index("by_projectId", ["projectId"]),

  // Files - central file storage tracking
  files: defineTable({
    // Ownership - one of these will be set
    brandVoiceId: v.optional(v.id("brandVoices")),
    personaId: v.optional(v.id("personas")),
    knowledgeBaseItemId: v.optional(v.id("knowledgeBaseItems")),
    exampleId: v.optional(v.id("examples")),
    // File metadata
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    r2Key: v.string(), // Cloudflare R2 object key
    extractedText: v.optional(v.string()), // Parsed text content
    createdAt: v.number(),
  })
    .index("by_brandVoiceId", ["brandVoiceId"])
    .index("by_personaId", ["personaId"])
    .index("by_knowledgeBaseItemId", ["knowledgeBaseItemId"])
    .index("by_exampleId", ["exampleId"])
    .index("by_r2Key", ["r2Key"]),
});
```

### File Storage Architecture

**R2 Bucket Structure:**
```
postmate-files/
  ├── {workspaceId}/
  │   ├── brand-voices/
  │   │   └── {fileId}-{sanitizedFilename}
  │   ├── personas/
  │   │   └── {fileId}-{sanitizedFilename}
  │   ├── knowledge-base/
  │   │   └── {fileId}-{sanitizedFilename}
  │   └── examples/
  │       └── {fileId}-{sanitizedFilename}
```

**Upload Flow:**
1. Client requests presigned upload URL via server function
2. Server generates R2 presigned PUT URL (expires in 5 minutes)
3. Client uploads file directly to R2
4. Client notifies server of upload completion with file metadata
5. Server extracts text (if applicable) and creates file record in Convex

**Download Flow:**
1. Client requests file access via query
2. Server validates user owns the workspace containing the file
3. Server generates R2 presigned GET URL (expires in 1 hour)
4. Client downloads file directly from R2

### Document Text Extraction

Text extraction runs server-side during upload completion:

**Supported Formats:**
- `.txt` - Direct text read
- `.pdf` - Use `pdf-parse` library
- `.doc/.docx` - Use `mammoth` library

**Implementation:**
- Extract text asynchronously after file upload confirmation
- Store extracted text in `files.extractedText` field
- Limit extracted text to 50,000 characters (truncate with notice)
- Store extraction errors in logs but do not fail the upload

---

## API Design

### Convex Queries

```typescript
// workspaces.ts
getMyWorkspace: query  // Get current user's workspace
needsOnboarding: query // Check if onboarding wizard should show

// projects.ts
listProjects: query({ workspaceId }) // List non-deleted projects
getProject: query({ projectId })     // Get single project with auth check

// categories.ts
listCategories: query({ projectId }) // List non-deleted categories
getCategory: query({ categoryId })   // Get single category

// brandVoices.ts
listBrandVoices: query({ projectId })     // List non-deleted brand voices
getBrandVoice: query({ brandVoiceId })    // Get single brand voice with files
getBrandVoiceFiles: query({ brandVoiceId }) // Get files for brand voice

// personas.ts
listPersonas: query({ projectId })    // List non-deleted personas
getPersona: query({ personaId })      // Get single persona with files
getPersonaFiles: query({ personaId }) // Get files for persona

// knowledgeBase.ts
listKnowledgeBaseItems: query({ categoryId }) // List items for category
getKnowledgeBaseItem: query({ itemId })       // Get single item with file

// examples.ts
listExamples: query({ categoryId }) // List examples for category
getExample: query({ exampleId })    // Get single example with file

// files.ts
getFileDownloadUrl: query({ fileId }) // Get presigned download URL
```

### Convex Mutations

```typescript
// workspaces.ts
completeOnboarding: mutation // Mark onboarding as complete

// projects.ts
createProject: mutation({ workspaceId, name, description? })
updateProject: mutation({ projectId, name?, description? })
deleteProject: mutation({ projectId }) // Soft delete

// categories.ts
createCategory: mutation({ projectId, name, description?, formatGuidelines? })
updateCategory: mutation({ categoryId, name?, description?, formatGuidelines? })
deleteCategory: mutation({ categoryId }) // Soft delete
reorderCategories: mutation({ projectId, categoryIds[] }) // Update sortOrder

// brandVoices.ts
createBrandVoice: mutation({ projectId, name, description? })
updateBrandVoice: mutation({ brandVoiceId, name?, description? })
deleteBrandVoice: mutation({ brandVoiceId }) // Soft delete

// personas.ts
createPersona: mutation({ projectId, name, description? })
updatePersona: mutation({ personaId, name?, description? })
deletePersona: mutation({ personaId }) // Soft delete

// knowledgeBase.ts
createKnowledgeBaseItem: mutation({ categoryId, title, content? })
updateKnowledgeBaseItem: mutation({ itemId, title?, content? })
deleteKnowledgeBaseItem: mutation({ itemId }) // Soft delete

// examples.ts
createExample: mutation({ categoryId, title, content?, notes? })
updateExample: mutation({ exampleId, title?, content?, notes? })
deleteExample: mutation({ exampleId }) // Soft delete

// files.ts
createFile: mutation({ ownerType, ownerId, filename, mimeType, sizeBytes, r2Key })
deleteFile: mutation({ fileId }) // Hard delete (also deletes from R2)
updateExtractedText: mutation({ fileId, extractedText })
```

### Server Functions (TanStack Start)

```typescript
// File upload flow
getUploadUrl: createServerFn({ method: 'POST' })
  // Input: { filename, mimeType, sizeBytes, ownerType, ownerId }
  // Returns: { uploadUrl, r2Key, expiresAt }

confirmUpload: createServerFn({ method: 'POST' })
  // Input: { r2Key, ownerType, ownerId, filename, mimeType, sizeBytes }
  // Triggers text extraction and creates file record
  // Returns: { fileId }

// File download
getDownloadUrl: createServerFn({ method: 'GET' })
  // Input: { fileId }
  // Returns: { downloadUrl, expiresAt }
```

---

## Data Models

### TypeScript Types

```typescript
// Workspace
type Workspace = {
  _id: Id<"workspaces">;
  userId: Id<"users">;
  onboardingCompleted: boolean;
  createdAt: number;
  updatedAt: number;
};

// Project
type Project = {
  _id: Id<"projects">;
  workspaceId: Id<"workspaces">;
  name: string;
  description?: string;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
};

// Category
type Category = {
  _id: Id<"categories">;
  projectId: Id<"projects">;
  name: string;
  description?: string;
  formatGuidelines?: string;
  isDefault: boolean;
  sortOrder: number;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
};

// BrandVoice
type BrandVoice = {
  _id: Id<"brandVoices">;
  projectId: Id<"projects">;
  name: string;
  description?: string;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
};

// Persona
type Persona = {
  _id: Id<"personas">;
  projectId: Id<"projects">;
  name: string;
  description?: string;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
};

// KnowledgeBaseItem
type KnowledgeBaseItem = {
  _id: Id<"knowledgeBaseItems">;
  categoryId: Id<"categories">;
  projectId: Id<"projects">;
  title: string;
  content?: string;
  fileId?: Id<"files">;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
};

// Example
type Example = {
  _id: Id<"examples">;
  categoryId: Id<"categories">;
  projectId: Id<"projects">;
  title: string;
  content?: string;
  notes?: string;
  fileId?: Id<"files">;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
};

// File
type File = {
  _id: Id<"files">;
  brandVoiceId?: Id<"brandVoices">;
  personaId?: Id<"personas">;
  knowledgeBaseItemId?: Id<"knowledgeBaseItems">;
  exampleId?: Id<"examples">;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  r2Key: string;
  extractedText?: string;
  createdAt: number;
};
```

---

## Validation Rules

| Entity | Field | Required | Max Length | Additional Rules |
|--------|-------|----------|------------|------------------|
| Project | name | Yes | 100 chars | Non-empty after trim |
| Project | description | No | 2000 chars | - |
| Category | name | Yes | 50 chars | Non-empty after trim |
| Category | description | No | 2000 chars | - |
| Category | formatGuidelines | No | 5000 chars | - |
| BrandVoice | name | Yes | 100 chars | Non-empty after trim |
| BrandVoice | description | No | 2000 chars | - |
| Persona | name | Yes | 100 chars | Non-empty after trim |
| Persona | description | No | 2000 chars | - |
| KnowledgeBaseItem | title | Yes | 200 chars | Non-empty after trim |
| KnowledgeBaseItem | content | No | 50000 chars | - |
| Example | title | Yes | 200 chars | Non-empty after trim |
| Example | content | No | 50000 chars | - |
| Example | notes | No | 2000 chars | - |
| File | filename | Yes | 255 chars | Valid filename characters |
| File | sizeBytes | Yes | - | Max 15728640 (15MB) |
| File | mimeType | Yes | - | Must be in allowed list |

**Allowed MIME Types:**
- `text/plain`
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`

---

## Default Data

### Default Categories

When a new project is created, populate these 6 default categories:

```typescript
const DEFAULT_CATEGORIES = [
  {
    name: "Blog Post",
    description: "Long-form content for your blog or website",
    formatGuidelines: `Word count: 800-2000 words
Structure: Title, introduction, 3-5 main sections with subheadings, conclusion
Tone: Informative and engaging
Include: Meta description (150-160 chars), featured image suggestion`,
    sortOrder: 1,
  },
  {
    name: "LinkedIn Article",
    description: "Professional long-form content for LinkedIn publishing",
    formatGuidelines: `Word count: 800-1500 words
Structure: Compelling headline, strong opening hook, clear sections, call-to-action
Tone: Professional yet conversational
Include: 3-5 relevant hashtags, engagement question at end`,
    sortOrder: 2,
  },
  {
    name: "LinkedIn Post",
    description: "Short-form professional content for LinkedIn feed",
    formatGuidelines: `Character limit: 3000 characters (optimal 1200-1500)
Structure: Hook in first line, value in body, CTA or question at end
Tone: Professional, authentic, conversational
Include: Line breaks for readability, 3-5 hashtags, optional emoji use`,
    sortOrder: 3,
  },
  {
    name: "Instagram Post",
    description: "Visual-first content with engaging caption",
    formatGuidelines: `Caption limit: 2200 characters (optimal 138-150 for feed visibility)
Structure: Hook, story/value, CTA
Tone: Casual, relatable, authentic
Include: Up to 30 hashtags (optimal 5-10), emoji usage encouraged, image direction`,
    sortOrder: 4,
  },
  {
    name: "X Thread",
    description: "Multi-post format for Twitter/X platform",
    formatGuidelines: `Per-post limit: 280 characters
Thread length: 5-15 posts optimal
Structure: Hook tweet, numbered points, summary/CTA final tweet
Tone: Concise, punchy, value-packed
Include: Thread numbering (1/X), strategic line breaks, minimal hashtags`,
    sortOrder: 5,
  },
  {
    name: "Case Study",
    description: "Structured business content showcasing results",
    formatGuidelines: `Word count: 1000-2500 words
Structure: Executive summary, challenge, solution, implementation, results, testimonial
Tone: Professional, data-driven, compelling
Include: Specific metrics, quotes, before/after comparison, visuals suggestions`,
    sortOrder: 6,
  },
];
```

---

## Security Considerations

**User Data Isolation:**
- All queries must verify user owns the workspace before returning data
- Workspace ID must be derived from authenticated user, never from client input for authorization
- Use Convex auth identity (`ctx.auth.getUserIdentity()`) for all authenticated operations

**File Access Control:**
- Presigned URLs are time-limited (5 min upload, 1 hour download)
- File ownership verified before generating download URLs
- R2 bucket not publicly accessible - all access via presigned URLs

**Authorization Pattern:**
```typescript
async function authorizeWorkspaceAccess(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new ConvexError("User not found");

  const workspace = await ctx.db
    .query("workspaces")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();
  if (!workspace) throw new ConvexError("Workspace not found");

  return { user, workspace };
}
```

**Soft Delete Security:**
- Soft-deleted records excluded from all list queries
- Direct access to soft-deleted records returns error
- No API to restore soft-deleted records (future enhancement)

---

## Dependencies

### NPM Packages (New)

```json
{
  "@aws-sdk/client-s3": "^3.x",      // R2 is S3-compatible
  "@aws-sdk/s3-request-presigner": "^3.x",
  "pdf-parse": "^1.x",               // PDF text extraction
  "mammoth": "^1.x"                  // Word document text extraction
}
```

### Environment Variables (New)

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=postmate-files
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
```

### Cloudflare R2 Setup

1. Create R2 bucket named `postmate-files` in Cloudflare dashboard
2. Generate R2 API token with read/write permissions
3. Configure CORS for bucket to allow uploads from app domain
4. Add environment variables to `wrangler.jsonc` for production

---

## Routes Structure

```
src/routes/
  ├── _authed.tsx                    # Protected layout (existing)
  ├── _authed/
  │   ├── dashboard.tsx              # Project dashboard
  │   ├── onboarding.tsx             # Onboarding wizard
  │   └── projects/
  │       └── $projectId/
  │           ├── index.tsx          # Project overview (redirect to categories)
  │           ├── categories.tsx     # Category management
  │           ├── brand-voices.tsx   # Brand voice management
  │           ├── personas.tsx       # Persona management
  │           ├── knowledge-base.tsx # Knowledge base management
  │           ├── examples.tsx       # Examples library
  │           └── settings.tsx       # Project settings
```

---

## Component Structure

```
src/components/
  ├── dashboard/
  │   ├── ProjectCard.tsx
  │   ├── ProjectGrid.tsx
  │   └── CreateProjectModal.tsx
  ├── onboarding/
  │   ├── OnboardingWizard.tsx
  │   ├── ProjectStep.tsx
  │   ├── BrandVoiceStep.tsx
  │   ├── PersonaStep.tsx
  │   └── CompleteStep.tsx
  ├── project/
  │   ├── ProjectSidebar.tsx
  │   ├── ProjectHeader.tsx
  │   └── ProjectLayout.tsx
  ├── categories/
  │   ├── CategoryList.tsx
  │   ├── CategoryCard.tsx
  │   └── CategoryForm.tsx
  ├── brand-voices/
  │   ├── BrandVoiceList.tsx
  │   ├── BrandVoiceCard.tsx
  │   └── BrandVoiceForm.tsx
  ├── personas/
  │   ├── PersonaList.tsx
  │   ├── PersonaCard.tsx
  │   └── PersonaForm.tsx
  ├── knowledge-base/
  │   ├── KnowledgeBaseList.tsx
  │   ├── KnowledgeBaseItemCard.tsx
  │   └── KnowledgeBaseItemForm.tsx
  ├── examples/
  │   ├── ExamplesList.tsx
  │   ├── ExampleCard.tsx
  │   └── ExampleForm.tsx
  └── shared/
      ├── FileUpload.tsx             # Reusable file upload component
      ├── FileList.tsx               # Display list of uploaded files
      ├── ConfirmDialog.tsx          # Confirmation modal for deletions
      ├── EmptyState.tsx             # Reusable empty state component
      └── LoadingState.tsx           # Reusable loading skeleton
```
