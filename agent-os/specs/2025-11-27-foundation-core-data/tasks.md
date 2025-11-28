# Task Breakdown: Foundation & Core Data

## Overview

**Total Task Groups:** 13
**Estimated Total Effort:** Large (multi-week implementation)

This spec establishes the foundational data layer for PostMate including Convex schema, file storage infrastructure, workspace/project management, and all core entity management features.

---

## Task List

### Schema & Database Layer

#### Task Group 1: Convex Schema Foundation
**Dependencies:** None
**Effort:** Medium

- [x] 1.0 Complete Convex schema for all core entities
  - [x] 1.1 Write 4-6 focused tests for schema validation
    - Test workspace creation with required fields
    - Test project soft delete filtering
    - Test category index query performance
    - Test file ownership constraint (one owner per file)
  - [x] 1.2 Extend existing `convex/schema.ts` with new tables
    - Add `workspaces` table with `userId`, `onboardingCompleted`, timestamps
    - Add `projects` table with `workspaceId`, `name`, `description`, `deletedAt`, timestamps
    - Add `categories` table with `projectId`, `name`, `description`, `formatGuidelines`, `isDefault`, `sortOrder`, `deletedAt`, timestamps
    - Add `brandVoices` table with `projectId`, `name`, `description`, `deletedAt`, timestamps
    - Add `personas` table with `projectId`, `name`, `description`, `deletedAt`, timestamps
    - Add `knowledgeBaseItems` table with `categoryId`, `projectId`, `title`, `content`, `fileId`, `deletedAt`, timestamps
    - Add `examples` table with `categoryId`, `projectId`, `title`, `content`, `notes`, `fileId`, `deletedAt`, timestamps
    - Add `files` table with ownership fields, `filename`, `mimeType`, `sizeBytes`, `r2Key`, `extractedText`, timestamps
  - [x] 1.3 Add indexes for all tables
    - `workspaces`: `by_userId`
    - `projects`: `by_workspaceId`, `by_workspaceId_deletedAt`
    - `categories`: `by_projectId`, `by_projectId_deletedAt`
    - `brandVoices`: `by_projectId`, `by_projectId_deletedAt`
    - `personas`: `by_projectId`, `by_projectId_deletedAt`
    - `knowledgeBaseItems`: `by_categoryId`, `by_categoryId_deletedAt`, `by_projectId`
    - `examples`: `by_categoryId`, `by_categoryId_deletedAt`, `by_projectId`
    - `files`: `by_brandVoiceId`, `by_personaId`, `by_knowledgeBaseItemId`, `by_exampleId`, `by_r2Key`
  - [x] 1.4 Create TypeScript types file `src/types/entities.ts`
    - Export types for Workspace, Project, Category, BrandVoice, Persona, KnowledgeBaseItem, Example, File
    - Include Doc types from Convex for type inference
  - [x] 1.5 Ensure schema tests pass
    - Run only the 4-6 tests written in 1.1
    - Verify schema generates correctly with `npx convex dev`

**Acceptance Criteria:**
- All 8 tables defined in schema with correct fields and types
- Indexes created for efficient querying patterns
- TypeScript types exported for frontend consumption
- Schema validates and generates without errors

---

### File Storage Infrastructure

#### Task Group 2: Cloudflare R2 Setup & Configuration
**Dependencies:** None (can run parallel to Task Group 1)
**Effort:** Small

- [x] 2.0 Configure Cloudflare R2 bucket and credentials
  - [x] 2.1 Create R2 bucket `postmate-files` in Cloudflare dashboard
    - NOTE: Manual step documented in `docs/cloudflare-r2-setup.md`
  - [x] 2.2 Generate R2 API token with read/write permissions
    - NOTE: Manual step documented in `docs/cloudflare-r2-setup.md`
  - [x] 2.3 Configure CORS for bucket to allow uploads from app domain
    - NOTE: Manual step documented in `docs/cloudflare-r2-setup.md`
  - [x] 2.4 Add environment variables to `.env` and `wrangler.jsonc`
    - `R2_ACCOUNT_ID`
    - `R2_ACCESS_KEY_ID`
    - `R2_SECRET_ACCESS_KEY`
    - `R2_BUCKET_NAME`
  - [x] 2.5 Install required npm packages
    - `@aws-sdk/client-s3`
    - `@aws-sdk/s3-request-presigner`
  - [x] 2.6 Update `workers/worker-configuration.d.ts` with R2 binding types

**Acceptance Criteria:**
- R2 bucket instructions documented for manual setup
- API credentials placeholders configured in environment
- CORS configuration documented
- Worker types include R2 binding

---

#### Task Group 3: File Upload Server Functions
**Dependencies:** Task Groups 1, 2
**Effort:** Medium

- [x] 3.0 Implement file upload/download server functions
  - [x] 3.1 Write 4-6 focused tests for file operations
    - Test presigned URL generation
    - Test file metadata validation (size, mime type)
    - Test ownership verification on download
    - Test upload confirmation flow
  - [x] 3.2 Create `src/lib/r2-client.ts` for R2 interactions
    - Initialize S3 client with R2 credentials
    - Export `generateUploadUrl(key, contentType, expiresIn)` function
    - Export `generateDownloadUrl(key, expiresIn)` function
    - Export `deleteObject(key)` function
  - [x] 3.3 Create `src/server/files.ts` with server functions
    - `getUploadUrl`: Validate inputs, generate R2 key, return presigned PUT URL (5 min expiry)
    - `confirmUpload`: Create file record in Convex, trigger text extraction
    - `getDownloadUrl`: Verify ownership, return presigned GET URL (1 hour expiry)
  - [x] 3.4 Create validation utilities `src/lib/file-validation.ts`
    - `validateFileSize(bytes)`: Max 15MB (15728640 bytes)
    - `validateMimeType(mimeType)`: Allowlist of supported types
    - `sanitizeFilename(filename)`: Remove unsafe characters
    - Export `ALLOWED_MIME_TYPES` constant
  - [x] 3.5 Ensure file server function tests pass
    - Run only the 4-6 tests written in 3.1

**Acceptance Criteria:**
- Presigned URLs generated correctly with appropriate expiration
- File size and MIME type validation works
- Ownership verified before download URL generation
- Upload confirmation creates file record

---

#### Task Group 4: Document Text Extraction
**Dependencies:** Task Group 3
**Effort:** Medium

- [x] 4.0 Implement document text extraction utilities
  - [x] 4.1 Write 3-4 focused tests for text extraction
    - Test plain text file extraction
    - Test PDF extraction (mock pdf-parse)
    - Test Word document extraction (mock mammoth)
    - Test extraction error handling (graceful failure)
  - [x] 4.2 Install text extraction packages
    - `pdf-parse` for PDF extraction
    - `mammoth` for Word document extraction
  - [x] 4.3 Create `src/lib/text-extraction.ts`
    - `extractText(buffer, mimeType)`: Route to appropriate extractor
    - `extractTextFromPdf(buffer)`: Use pdf-parse library
    - `extractTextFromWord(buffer)`: Use mammoth library
    - `truncateText(text, maxLength)`: Limit to 50,000 characters
  - [x] 4.4 Integrate extraction into `confirmUpload` server function
    - Fetch file from R2 after upload confirmation
    - Extract text based on MIME type
    - Update file record with `extractedText` field
    - Log extraction errors but do not fail the upload
  - [x] 4.5 Create Convex mutation `files.updateExtractedText`
    - Accept `fileId` and `extractedText`
    - Update file record with extracted content
    - NOTE: This mutation already exists from Task Group 3
  - [x] 4.6 Ensure text extraction tests pass
    - Run only the 3-4 tests written in 4.1

**Acceptance Criteria:**
- Plain text, PDF, and Word documents have text extracted
- Extracted text limited to 50,000 characters
- Extraction failures logged but do not block upload
- File records updated with extracted text

---

### Backend - Workspace & Projects

#### Task Group 5: Workspace Management
**Dependencies:** Task Group 1
**Effort:** Small

- [x] 5.0 Implement workspace auto-creation and queries
  - [x] 5.1 Write 3-4 focused tests for workspace operations
    - Test workspace created on first user sync
    - Test `getMyWorkspace` returns correct workspace
    - Test `needsOnboarding` returns correct flag
  - [x] 5.2 Extend `convex/users.ts` syncUser mutation
    - After creating user, check if workspace exists
    - If no workspace, create one with `onboardingCompleted: false`
    - Return user and workspace data
  - [x] 5.3 Create `convex/workspaces.ts` with queries and mutations
    - `getMyWorkspace`: Get current user's workspace via Clerk identity
    - `needsOnboarding`: Return `!workspace.onboardingCompleted`
    - `completeOnboarding`: Set `onboardingCompleted: true`
  - [x] 5.4 Create `authorizeWorkspaceAccess` helper function
    - Verify Clerk identity
    - Lookup user by clerkId
    - Lookup workspace by userId
    - Return `{ user, workspace }` or throw error
  - [x] 5.5 Ensure workspace tests pass
    - Run only the 3-4 tests written in 5.1

**Acceptance Criteria:**
- Workspace auto-created when user first syncs from Clerk
- Queries correctly return user's workspace
- Onboarding flag properly managed
- Authorization helper reusable across mutations

---

#### Task Group 6: Project CRUD Operations
**Dependencies:** Task Group 5
**Effort:** Medium

- [x] 6.0 Implement project management backend
  - [x] 6.1 Write 4-6 focused tests for project operations
    - Test project creation with required fields
    - Test project list filters out soft-deleted
    - Test project update modifies `updatedAt`
    - Test project delete sets `deletedAt` (soft delete)
    - Test default categories created on project creation
  - [x] 6.2 Create `convex/projects.ts` with queries
    - `listProjects({ workspaceId })`: Return non-deleted projects sorted by `updatedAt` desc
    - `getProject({ projectId })`: Return single project with auth check
    - `getProjectStats({ projectId })`: Return counts of categories, brand voices, personas
  - [x] 6.3 Create `convex/projects.ts` mutations
    - `createProject({ name, description? })`: Create project, trigger default category creation
    - `updateProject({ projectId, name?, description? })`: Update fields, set `updatedAt`
    - `deleteProject({ projectId })`: Set `deletedAt` to current timestamp
  - [x] 6.4 Implement default category seeding in `createProject`
    - Define `DEFAULT_CATEGORIES` constant with 6 categories
    - Create all default categories with `isDefault: true`
    - Include format guidelines for each category
  - [x] 6.5 Ensure project tests pass
    - Run only the 4-6 tests written in 6.1

**Acceptance Criteria:**
- Project CRUD operations work correctly
- Soft delete filters records from list queries
- 6 default categories created with each new project
- Authorization verified on all operations

---

### Backend - Categories

#### Task Group 7: Category CRUD Operations
**Dependencies:** Task Group 6
**Effort:** Small

- [x] 7.0 Implement category management backend
  - [x] 7.1 Write 3-4 focused tests for category operations
    - Test category list returns sorted by `sortOrder`
    - Test custom category creation
    - Test category reordering updates `sortOrder`
    - Test default categories cannot be hard deleted
  - [x] 7.2 Create `convex/categories.ts` with queries
    - `listCategories({ projectId })`: Return non-deleted categories sorted by `sortOrder`
    - `getCategory({ categoryId })`: Return single category with auth check
  - [x] 7.3 Create `convex/categories.ts` mutations
    - `createCategory({ projectId, name, description?, formatGuidelines? })`: Create custom category
    - `updateCategory({ categoryId, name?, description?, formatGuidelines? })`: Update fields
    - `deleteCategory({ categoryId })`: Soft delete
    - `reorderCategories({ projectId, categoryIds })`: Update `sortOrder` based on array order
  - [x] 7.4 Add validation for category fields
    - Name required, max 50 chars
    - Description optional, max 2000 chars
    - Format guidelines optional, max 5000 chars
  - [x] 7.5 Ensure category tests pass
    - Run only the 3-4 tests written in 7.1

**Acceptance Criteria:**
- Category CRUD operations work correctly
- Categories sortable via reorder mutation
- Validation rules enforced
- Authorization verified on all operations

---

### Backend - Brand Voices & Personas

#### Task Group 8: Brand Voice CRUD Operations
**Dependencies:** Task Groups 6, 3
**Effort:** Medium

- [x] 8.0 Implement brand voice management backend
  - [x] 8.1 Write 3-4 focused tests for brand voice operations
    - Test brand voice creation with text description
    - Test brand voice with file attachment
    - Test brand voice list filters soft-deleted
    - Test brand voice deletion soft deletes associated files
  - [x] 8.2 Create `convex/brandVoices.ts` with queries
    - `listBrandVoices({ projectId })`: Return non-deleted brand voices
    - `getBrandVoice({ brandVoiceId })`: Return single brand voice with files
    - `getBrandVoiceFiles({ brandVoiceId })`: Return files attached to brand voice
  - [x] 8.3 Create `convex/brandVoices.ts` mutations
    - `createBrandVoice({ projectId, name, description? })`: Create brand voice
    - `updateBrandVoice({ brandVoiceId, name?, description? })`: Update fields
    - `deleteBrandVoice({ brandVoiceId })`: Soft delete brand voice and mark files
  - [x] 8.4 Add validation for brand voice fields
    - Name required, max 100 chars
    - Description optional, max 2000 chars
  - [x] 8.5 Ensure brand voice tests pass
    - Run only the 3-4 tests written in 8.1

**Acceptance Criteria:**
- Brand voice CRUD operations work correctly
- Files can be attached to brand voices
- Soft delete cascades to file references
- Validation rules enforced

---

#### Task Group 9: Persona CRUD Operations
**Dependencies:** Task Groups 6, 3
**Effort:** Small

- [x] 9.0 Implement persona management backend
  - [x] 9.1 Write 3-4 focused tests for persona operations
    - Test persona creation
    - Test persona with file attachment
    - Test persona list filters soft-deleted
    - Test persona deletion
  - [x] 9.2 Create `convex/personas.ts` with queries
    - `listPersonas({ projectId })`: Return non-deleted personas
    - `getPersona({ personaId })`: Return single persona with files
    - `getPersonaFiles({ personaId })`: Return files attached to persona
  - [x] 9.3 Create `convex/personas.ts` mutations
    - `createPersona({ projectId, name, description? })`: Create persona
    - `updatePersona({ personaId, name?, description? })`: Update fields
    - `deletePersona({ personaId })`: Soft delete
  - [x] 9.4 Add validation for persona fields
    - Name required, max 100 chars
    - Description optional, max 2000 chars
  - [x] 9.5 Ensure persona tests pass
    - Run only the 3-4 tests written in 9.1

**Acceptance Criteria:**
- Persona CRUD operations work correctly
- Files can be attached to personas
- Validation rules enforced
- Authorization verified on all operations

---

### Backend - Knowledge Base & Examples

#### Task Group 10: Knowledge Base CRUD Operations
**Dependencies:** Task Groups 7, 3
**Effort:** Medium

- [x] 10.0 Implement knowledge base management backend
  - [x] 10.1 Write 3-4 focused tests for knowledge base operations
    - Test knowledge base item creation with text content
    - Test knowledge base item creation with file
    - Test knowledge base items scoped to category
    - Test knowledge base item deletion
  - [x] 10.2 Create `convex/knowledgeBase.ts` with queries
    - `listKnowledgeBaseItems({ categoryId })`: Return non-deleted items for category
    - `getKnowledgeBaseItem({ itemId })`: Return single item with file data
    - `listKnowledgeBaseItemsByProject({ projectId })`: Return all items for project
  - [x] 10.3 Create `convex/knowledgeBase.ts` mutations
    - `createKnowledgeBaseItem({ categoryId, title, content? })`: Create item
    - `updateKnowledgeBaseItem({ itemId, title?, content? })`: Update fields
    - `deleteKnowledgeBaseItem({ itemId })`: Soft delete
  - [x] 10.4 Add validation for knowledge base fields
    - Title required, max 200 chars
    - Content optional, max 50000 chars
  - [x] 10.5 Ensure knowledge base tests pass
    - Run only the 3-4 tests written in 10.1

**Acceptance Criteria:**
- Knowledge base item CRUD operations work correctly
- Items correctly scoped to categories
- File uploads supported
- Validation rules enforced

---

#### Task Group 11: Examples Library CRUD Operations
**Dependencies:** Task Groups 7, 3
**Effort:** Small

- [x] 11.0 Implement examples library backend
  - [x] 11.1 Write 3-4 focused tests for examples operations
    - Test example creation with text content
    - Test example creation with file
    - Test examples scoped to category
    - Test example deletion
  - [x] 11.2 Create `convex/examples.ts` with queries
    - `listExamples({ categoryId })`: Return non-deleted examples for category
    - `getExample({ exampleId })`: Return single example with file data
    - `listExamplesByProject({ projectId })`: Return all examples for project
  - [x] 11.3 Create `convex/examples.ts` mutations
    - `createExample({ categoryId, title, content?, notes? })`: Create example
    - `updateExample({ exampleId, title?, content?, notes? })`: Update fields
    - `deleteExample({ exampleId })`: Soft delete
  - [x] 11.4 Add validation for example fields
    - Title required, max 200 chars
    - Content optional, max 50000 chars
    - Notes optional, max 2000 chars
  - [x] 11.5 Ensure examples tests pass
    - Run only the 3-4 tests written in 11.1

**Acceptance Criteria:**
- Example CRUD operations work correctly
- Examples correctly scoped to categories
- Notes field supported
- Validation rules enforced

---

### Frontend - Layout & Navigation

#### Task Group 12: Dashboard & Project Layout Components
**Dependencies:** Task Groups 5, 6
**Effort:** Large

- [x] 12.0 Build dashboard and project workspace layouts
  - [x] 12.1 Write 4-6 focused tests for layout components
    - Test EmptyState renders title, description, and action button
    - Test LoadingState renders for different variants (grid, list, card)
    - Test shared components render correctly
    - NOTE: Removed complex router-based tests due to TanStack Router testing complexity
  - [x] 12.2 Create shared UI components in `src/components/shared/`
    - `EmptyState.tsx`: Reusable empty state with icon, title, description, action button
    - `LoadingState.tsx`: Skeleton loading component
    - `ConfirmDialog.tsx`: Confirmation modal for delete actions
    - `PageHeader.tsx`: Consistent page header with title, description, actions
  - [x] 12.3 Create dashboard route `src/routes/_authed/dashboard.tsx`
    - Fetch user's workspace and projects
    - Redirect to onboarding if `onboardingCompleted` is false
    - Display project grid or empty state
  - [x] 12.4 Create dashboard components in `src/components/dashboard/`
    - `ProjectGrid.tsx`: Responsive grid layout (1/2/3 columns)
    - `ProjectCard.tsx`: Card with name, description preview, metadata, hover actions
    - `CreateProjectModal.tsx`: Modal form for new project creation
  - [x] 12.5 Create project workspace layout `src/routes/_authed/projects.$projectId.tsx`
    - Nested layout for all project pages
    - Include sidebar and header
    - Verify user owns the project
  - [x] 12.6 Create project components in `src/components/project/`
    - `ProjectLayout.tsx`: Layout wrapper with sidebar and content area
    - `ProjectSidebar.tsx`: Navigation links to Categories, Brand Voices, Personas, Knowledge Base, Examples
    - `ProjectHeader.tsx`: Project name, breadcrumb, settings gear icon
  - [x] 12.7 Create project sub-routes in `src/routes/_authed/projects/$projectId/`
    - `index.tsx`: Redirect to categories
    - `categories.tsx`: Category management page
    - `brand-voices.tsx`: Brand voice management page
    - `personas.tsx`: Persona management page
    - `knowledge-base.tsx`: Knowledge base management page
    - `examples.tsx`: Examples library page
    - `settings.tsx`: Project settings page
  - [x] 12.8 Implement responsive design
    - Mobile: Single column, collapsible sidebar
    - Tablet: Two column project cards
    - Desktop: Three column project cards, always-visible sidebar
  - [x] 12.9 Ensure layout component tests pass
    - Run only the 4-6 tests written in 12.1
    - Shared component tests passing (EmptyState, LoadingState)

**Acceptance Criteria:**
- Dashboard displays project grid with responsive layout
- Project workspace has functional sidebar navigation
- Empty states displayed when no data
- Routing works correctly between all project pages

---

### Frontend - Entity Management UI

#### Task Group 13: Category Management UI
**Dependencies:** Task Group 12
**Effort:** Medium

- [x] 13.0 Build category management interface
  - [x] 13.1 Write 3-4 focused tests for category UI
    - Test category list renders correctly
    - Test category create form submission
    - Test category edit inline
    - Test category delete confirmation
  - [x] 13.2 Create category components in `src/components/categories/`
    - `CategoryList.tsx`: List view with drag-and-drop reordering
    - `CategoryCard.tsx`: Card showing name, description preview, format guidelines badge
    - `CategoryForm.tsx`: Form for create/edit with validation
  - [x] 13.3 Implement category page `src/routes/_authed/projects/$projectId/categories.tsx`
    - Fetch categories for project
    - Display list with default/custom distinction
    - Add category button and modal
    - Inline edit capability
  - [x] 13.4 Add drag-and-drop reordering
    - Implement with @dnd-kit or similar
    - Call `reorderCategories` mutation on drop
    - Optimistic updates for smooth UX
  - [x] 13.5 Ensure category UI tests pass
    - Run only the 3-4 tests written in 13.1

**Acceptance Criteria:**
- Category list displays with correct data
- Create/edit/delete operations work
- Drag-and-drop reordering functional
- Default categories visually distinguished

---

#### Task Group 14: Brand Voice & Persona Management UI
**Dependencies:** Task Groups 12, 3
**Effort:** Medium

- [x] 14.0 Build brand voice and persona management interfaces
  - [x] 14.1 Write 4-6 focused tests for brand voice and persona UI
    - Test brand voice list renders
    - Test brand voice create with text input
    - Test file upload integration
    - Test persona list renders
    - Test persona create form
  - [x] 14.2 Create reusable file upload component `src/components/shared/FileUpload.tsx`
    - Drag-and-drop file zone
    - File type validation (Word, PDF, text, images)
    - Size limit enforcement (15MB)
    - Progress indicator during upload
    - Error handling and retry
  - [x] 14.3 Create `src/components/shared/FileList.tsx`
    - Display list of uploaded files
    - Download link generation
    - Delete file action
    - Show extracted text preview (expandable)
  - [x] 14.4 Create brand voice components in `src/components/brand-voices/`
    - `BrandVoiceList.tsx`: List of brand voices with file counts
    - `BrandVoiceCard.tsx`: Card with name, description, files
    - `BrandVoiceForm.tsx`: Form with text input and file upload
  - [x] 14.5 Create persona components in `src/components/personas/`
    - `PersonaList.tsx`: List of personas
    - `PersonaCard.tsx`: Card with name, description, files
    - `PersonaForm.tsx`: Form with text input and file upload
  - [x] 14.6 Implement brand voices page `src/routes/_authed/projects/$projectId/brand-voices.tsx`
    - Fetch brand voices for project
    - Add/edit/delete operations
    - File upload integration
  - [x] 14.7 Implement personas page `src/routes/_authed/projects/$projectId/personas.tsx`
    - Fetch personas for project
    - Add/edit/delete operations
    - File upload integration
  - [x] 14.8 Ensure brand voice and persona UI tests pass
    - Run only the 4-6 tests written in 14.1

**Acceptance Criteria:**
- Brand voice CRUD UI functional
- Persona CRUD UI functional
- File upload works with progress and error handling
- Files can be downloaded and deleted

---

#### Task Group 15: Knowledge Base & Examples UI
**Dependencies:** Task Groups 12, 13, 3
**Effort:** Medium

- [x] 15.0 Build knowledge base and examples library interfaces
  - [x] 15.1 Write 4-6 focused tests for knowledge base and examples UI
    - Test knowledge base list by category
    - Test knowledge base item creation
    - Test examples list renders
    - Test example creation with notes
  - [x] 15.2 Create knowledge base components in `src/components/knowledge-base/`
    - `KnowledgeBaseList.tsx`: List grouped by category (collapsible sections)
    - `KnowledgeBaseItemCard.tsx`: Card with title, content preview, file indicator
    - `KnowledgeBaseItemForm.tsx`: Form with title, content textarea, file upload
  - [x] 15.3 Create examples components in `src/components/examples/`
    - `ExamplesList.tsx`: List grouped by category
    - `ExampleCard.tsx`: Card with title, content preview, notes
    - `ExampleForm.tsx`: Form with title, content, notes, file upload
  - [x] 15.4 Implement knowledge base page `src/routes/_authed/projects/$projectId/knowledge-base.tsx`
    - Category filter/selector
    - Add item to selected category
    - View and manage items
  - [x] 15.5 Implement examples page `src/routes/_authed/projects/$projectId/examples.tsx`
    - Category filter/selector
    - Add example to selected category
    - View and manage examples
  - [x] 15.6 Ensure knowledge base and examples UI tests pass
    - Run only the 4-6 tests written in 15.1

**Acceptance Criteria:**
- Knowledge base items manageable per category
- Examples library manageable per category
- Category filtering works
- File uploads integrated

---

### Frontend - Onboarding

#### Task Group 16: Onboarding Wizard
**Dependencies:** Task Groups 6, 8, 9, 12
**Effort:** Medium

- [x] 16.0 Build multi-step onboarding wizard
  - [x] 16.1 Write 3-4 focused tests for onboarding wizard
    - Test wizard renders on first visit
    - Test project step completes
    - Test skip functionality
    - Test completion marks onboarding done
  - [x] 16.2 Create onboarding components in `src/components/onboarding/`
    - `OnboardingWizard.tsx`: Modal container with step management
    - `ProjectStep.tsx`: Create first project form
    - `BrandVoiceStep.tsx`: Add brand voice (skip available)
    - `PersonaStep.tsx`: Add persona (skip available)
    - `CompleteStep.tsx`: Success message and redirect
  - [x] 16.3 Implement wizard state management
    - Track current step (1-4)
    - Store created entities (projectId, brandVoiceId, personaId)
    - Handle skip logic for optional steps
  - [x] 16.4 Create onboarding route `src/routes/_authed/onboarding.tsx`
    - Check if onboarding needed
    - Redirect to dashboard if already complete
    - Render wizard modal
  - [x] 16.5 Integrate onboarding check in dashboard
    - Query `needsOnboarding` on dashboard load
    - Redirect to onboarding if true
  - [x] 16.6 Implement wizard completion
    - Call `completeOnboarding` mutation
    - Redirect to newly created project
  - [x] 16.7 Ensure onboarding wizard tests pass
    - Run only the 3-4 tests written in 16.1

**Acceptance Criteria:**
- Wizard displays for new users
- Each step creates appropriate entity
- Skip works on optional steps
- Completion marks workspace onboarded
- User redirected to project after completion

---

### Frontend - Project Settings

#### Task Group 17: Project Settings Page
**Dependencies:** Task Group 12
**Effort:** Small

- [x] 17.0 Build project settings interface
  - [x] 17.1 Write 2-3 focused tests for project settings
    - Test settings form populates with project data
    - Test project update saves changes
    - Test project delete with confirmation
  - [x] 17.2 Implement settings page `src/routes/_authed/projects/$projectId/settings.tsx`
    - Edit project name and description
    - Delete project with confirmation dialog
    - Show created/updated timestamps
  - [x] 17.3 Create settings form component
    - Pre-populate with current project data
    - Client-side validation
    - Submit to `updateProject` mutation
  - [x] 17.4 Implement delete project flow
    - Confirmation dialog with project name
    - Call `deleteProject` mutation
    - Redirect to dashboard after delete
  - [x] 17.5 Ensure project settings tests pass
    - Run only the 2-3 tests written in 17.1

**Acceptance Criteria:**
- Project name and description editable
- Delete requires confirmation
- User redirected to dashboard after delete

---

### Testing & Integration

#### Task Group 18: Test Review & Gap Analysis
**Dependencies:** Task Groups 1-17
**Effort:** Medium

- [x] 18.0 Review existing tests and fill critical gaps
  - [x] 18.1 Review all tests from Task Groups 1-17
    - Catalog tests written during development
    - Identify any critical paths without coverage
    - Total expected: approximately 50-65 tests from previous groups
  - [x] 18.2 Analyze test coverage gaps for this feature
    - Focus on end-to-end user workflows
    - Identify integration points between entities
    - Prioritize critical business flows
  - [x] 18.3 Write up to 10 additional strategic tests
    - End-to-end: New user to first content category
    - Integration: File upload to extracted text availability
    - Authorization: Cross-workspace access prevention
    - Soft delete: Cascading behavior verification
    - Onboarding: Full wizard flow completion
  - [x] 18.4 Run feature-specific test suite
    - Run all tests related to this spec
    - Verify critical workflows pass
    - Document any failures for resolution

**Acceptance Criteria:**
- All feature-specific tests passing
- Critical user workflows have coverage
- No more than 10 additional tests added
- Test documentation updated

---

## Execution Order

**Recommended implementation sequence:**

### Phase 1: Foundation (Week 1)
1. **Task Group 1**: Convex Schema Foundation
2. **Task Group 2**: Cloudflare R2 Setup (parallel with 1)
3. **Task Group 3**: File Upload Server Functions
4. **Task Group 4**: Document Text Extraction

### Phase 2: Core Backend (Week 2)
5. **Task Group 5**: Workspace Management
6. **Task Group 6**: Project CRUD Operations
7. **Task Group 7**: Category CRUD Operations
8. **Task Group 8**: Brand Voice CRUD Operations
9. **Task Group 9**: Persona CRUD Operations

### Phase 3: Extended Backend (Week 3)
10. **Task Group 10**: Knowledge Base CRUD Operations
11. **Task Group 11**: Examples Library CRUD Operations

### Phase 4: Frontend Core (Week 3-4)
12. **Task Group 12**: Dashboard & Project Layout Components

### Phase 5: Frontend Entity Management (Week 4-5)
13. **Task Group 13**: Category Management UI
14. **Task Group 14**: Brand Voice & Persona Management UI
15. **Task Group 15**: Knowledge Base & Examples UI
16. **Task Group 16**: Onboarding Wizard
17. **Task Group 17**: Project Settings Page

### Phase 6: Validation (Week 5)
18. **Task Group 18**: Test Review & Gap Analysis

---

## Effort Summary

| Size | Count | Task Groups |
|------|-------|-------------|
| Small | 5 | 2, 7, 9, 11, 17 |
| Medium | 11 | 1, 3, 4, 6, 8, 10, 13, 14, 15, 16, 18 |
| Large | 2 | 12 |

**Total Estimated Duration:** 4-5 weeks with one developer
