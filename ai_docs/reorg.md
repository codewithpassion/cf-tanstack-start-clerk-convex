# Project Layout Reorganization

## Overview

Revamp the project layout at `/projects/$projectId` to remove the sidebar and streamline the UI.

## Goals

1. **Remove sidebar completely** - It doesn't add much value
2. **Move Categories to Settings** - Better organization
3. **Move config options to header** - Brand Voice, Personas, KB, Examples as buttons (right-aligned on desktop, dropdown on mobile)
4. **Frosted glass modals** - Semi-transparent modal panels with backdrop blur effect (not opaque)

## Current State

- ❌ Sidebar exists with navigation to Categories, Brand Voice, Personas, KB, Examples
- ❌ Each config option has its own route page
- ❌ Dialogs use semi-transparent backdrop but opaque modal panels
- ❌ Categories are in sidebar navigation

## Target State

- ✅ No sidebar
- ✅ Categories moved to Settings page
- ✅ Config options in header as buttons (desktop) / dropdown (mobile)
- ✅ Frosted glass modals with blur effect
- ✅ All config options accessible via modals (not routes)

---

## Todo List

### Phase 1: Shared Components
- [ ] Create shared Modal component with frosted glass effect

### Phase 2: Header & Layout
- [ ] Modify ProjectHeader - add config buttons and mobile dropdown
- [ ] Modify ProjectLayout - remove sidebar, add modal state

### Phase 3: Configuration Modals
- [ ] Create BrandVoicesModal component
- [ ] Create PersonasModal component
- [ ] Create KnowledgeBaseModal component
- [ ] Create ExamplesModal component

### Phase 4: Settings Integration
- [ ] Move Categories to Settings page

### Phase 5: Cleanup
- [ ] Delete obsolete route files and sidebar component
- [ ] Run type check and fix any issues

---

## Detailed Implementation Plan

### 1. Create Shared Modal Component

**File:** `src/components/shared/Modal.tsx`

**Purpose:** Reusable modal wrapper with frosted glass effect and semi-transparent backdrop blur.

**Props:**
```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  children: React.ReactNode;
}
```

**Styling Requirements:**
- Semi-transparent backdrop: `bg-black/40` with `backdrop-blur-sm`
- Frosted glass panel: `bg-white/80 dark:bg-slate-900/80` with `backdrop-blur-xl`
- Border with subtle glow: `border border-white/20 dark:border-slate-700/50`
- Shadow for depth: `shadow-2xl`
- Rounded corners: `rounded-2xl`

**Example Structure:**
```tsx
<div className="fixed inset-0 z-50 overflow-y-auto">
  <div className="flex min-h-screen items-center justify-center p-4">
    {/* Backdrop with blur */}
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    />

    {/* Frosted glass panel */}
    <div className="relative transform overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-2xl transition-all sm:my-8 w-full max-w-{size}">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50">
        <h2>{title}</h2>
        <button onClick={onClose}>X</button>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {children}
      </div>
    </div>
  </div>
</div>
```

---

### 2. Modify ProjectHeader

**File:** `src/components/project/ProjectHeader.tsx`

**Changes:**
1. Remove sidebar toggle button and related props (`onToggleSidebar`, `sidebarOpen`)
2. Add configuration button handlers
3. Add right-aligned button group for desktop
4. Add dropdown menu for mobile

**New Props:**
```tsx
interface ProjectHeaderProps {
  project: Project;
  onOpenBrandVoices: () => void;
  onOpenPersonas: () => void;
  onOpenKnowledgeBase: () => void;
  onOpenExamples: () => void;
}
```

**Desktop Layout:**
```
[Breadcrumb] [Project Title]                [Brand Voice] [Personas] [KB] [Examples]
```

**Mobile Layout:**
```
[Project Title]                             [☰ Configure ▼]
                                            └─ Brand Voice
                                            └─ Personas
                                            └─ Knowledge Base
                                            └─ Examples
```

**Implementation Notes:**
- Use `hidden lg:flex` for desktop button group
- Use `lg:hidden` for mobile dropdown
- Dropdown can use a simple `useState` toggle or a headless UI library
- Buttons should match existing design system (cyan-600 bg, etc.)

---

### 3. Modify ProjectLayout

**File:** `src/components/project/ProjectLayout.tsx`

**Changes:**
1. Remove all sidebar-related code:
   - `sidebarOpen` state
   - `ProjectSidebar` import and component
   - Sidebar overlay div
   - Sidebar container div
2. Remove sidebar width from layout (no more flex with sidebar)
3. Add modal state for each configuration option
4. Pass modal handlers to ProjectHeader
5. Render configuration modals at layout level

**New State:**
```tsx
const [brandVoicesOpen, setBrandVoicesOpen] = useState(false);
const [personasOpen, setPersonasOpen] = useState(false);
const [knowledgeBaseOpen, setKnowledgeBaseOpen] = useState(false);
const [examplesOpen, setExamplesOpen] = useState(false);
```

**New Structure:**
```tsx
return (
  <div className="min-h-screen flex flex-col">
    <ProjectHeader
      project={project}
      onOpenBrandVoices={() => setBrandVoicesOpen(true)}
      onOpenPersonas={() => setPersonasOpen(true)}
      onOpenKnowledgeBase={() => setKnowledgeBaseOpen(true)}
      onOpenExamples={() => setExamplesOpen(true)}
    />

    {/* Main content - no more flex with sidebar */}
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-amber-950/20 dark:via-slate-950 dark:to-slate-950">
      <div className="max-w-7xl mx-auto sm:p-4 md:p-6">
        <Outlet />
      </div>
    </main>

    {/* Configuration Modals */}
    {brandVoicesOpen && (
      <BrandVoicesModal
        isOpen={brandVoicesOpen}
        onClose={() => setBrandVoicesOpen(false)}
        projectId={projectId}
      />
    )}

    {personasOpen && (
      <PersonasModal
        isOpen={personasOpen}
        onClose={() => setPersonasOpen(false)}
        projectId={projectId}
      />
    )}

    {knowledgeBaseOpen && (
      <KnowledgeBaseModal
        isOpen={knowledgeBaseOpen}
        onClose={() => setKnowledgeBaseOpen(false)}
        projectId={projectId}
      />
    )}

    {examplesOpen && (
      <ExamplesModal
        isOpen={examplesOpen}
        onClose={() => setExamplesOpen(false)}
        projectId={projectId}
      />
    )}
  </div>
);
```

---

### 4. Create BrandVoicesModal

**File:** `src/components/brand-voices/BrandVoicesModal.tsx`

**Purpose:** Full-featured modal containing brand voices list + create/edit functionality.

**Props:**
```tsx
interface BrandVoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}
```

**Structure:**
```tsx
export function BrandVoicesModal({ isOpen, onClose, projectId }: BrandVoicesModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingBrandVoice, setEditingBrandVoice] = useState<Doc<"brandVoices"> | null>(null);

  const brandVoices = useQuery(api.brandVoices.listBrandVoices, {
    projectId: projectId as Id<"projects">,
  });

  // Show form if creating or editing
  if (isCreating || editingBrandVoice) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={editingBrandVoice ? "Edit Brand Voice" : "Create Brand Voice"} size="2xl">
        <BrandVoiceForm
          projectId={projectId}
          brandVoice={editingBrandVoice ?? undefined}
          onSuccess={() => {
            setIsCreating(false);
            setEditingBrandVoice(null);
          }}
          onCancel={() => {
            setIsCreating(false);
            setEditingBrandVoice(null);
          }}
        />
      </Modal>
    );
  }

  // Show list view
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Brand Voices" size="3xl">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Define your brand's unique voice and tone to ensure consistent messaging.
          </p>
          <button onClick={() => setIsCreating(true)} className="...">
            Create Brand Voice
          </button>
        </div>

        <BrandVoiceList
          brandVoices={brandVoices ?? []}
          onCreate={() => setIsCreating(true)}
          onEdit={setEditingBrandVoice}
          onDelete={handleDelete}
        />
      </div>
    </Modal>
  );
}
```

**Notes:**
- Reuse existing `BrandVoiceList` and `BrandVoiceForm` components
- Handle create/edit state internally
- Use conditional rendering to switch between list and form views

---

### 5. Create PersonasModal

**File:** `src/components/personas/PersonasModal.tsx`

**Structure:** Same pattern as BrandVoicesModal

**Props:**
```tsx
interface PersonasModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}
```

**Implementation:**
- Copy structure from BrandVoicesModal
- Replace with personas-specific queries, mutations, components
- Use `PersonaList` and `PersonaForm` components

---

### 6. Create KnowledgeBaseModal

**File:** `src/components/knowledge-base/KnowledgeBaseModal.tsx`

**Additional Complexity:** Category selection required before showing items.

**Props:**
```tsx
interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}
```

**Structure:**
```tsx
export function KnowledgeBaseModal({ isOpen, onClose, projectId }: KnowledgeBaseModalProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<"categories"> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<Doc<"knowledgeBaseItems"> | null>(null);

  const categories = useQuery(api.categories.listCategories, {
    projectId: projectId as Id<"projects">,
  });

  const items = useQuery(
    api.knowledgeBase.listItems,
    selectedCategoryId ? { categoryId: selectedCategoryId } : "skip"
  );

  // Show form if creating or editing
  if (isCreating || editingItem) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={editingItem ? "Edit Item" : "Add Item"} size="2xl">
        <KnowledgeBaseItemForm
          categoryId={selectedCategoryId!}
          item={editingItem ?? undefined}
          onSuccess={() => { setIsCreating(false); setEditingItem(null); }}
          onCancel={() => { setIsCreating(false); setEditingItem(null); }}
        />
      </Modal>
    );
  }

  // Show list view with category selector
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Knowledge Base" size="3xl">
      <div className="space-y-4">
        {/* Category Selector */}
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium">Category:</label>
          <select
            value={selectedCategoryId ?? ""}
            onChange={(e) => setSelectedCategoryId(e.target.value as Id<"categories">)}
            className="..."
          >
            <option value="">Select a category</option>
            {categories?.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>

          {selectedCategoryId && (
            <button onClick={() => setIsCreating(true)} className="...">
              Add Item
            </button>
          )}
        </div>

        {selectedCategoryId && (
          <KnowledgeBaseList
            items={items ?? []}
            onEdit={setEditingItem}
            onDelete={handleDelete}
          />
        )}
      </div>
    </Modal>
  );
}
```

---

### 7. Create ExamplesModal

**File:** `src/components/examples/ExamplesModal.tsx`

**Structure:** Same pattern as KnowledgeBaseModal (requires category selection)

**Props:**
```tsx
interface ExamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}
```

**Implementation:**
- Copy structure from KnowledgeBaseModal
- Replace with examples-specific queries, mutations, components
- Use `ExamplesList` and `ExampleForm` components

---

### 8. Move Categories to Settings

**File:** `src/routes/_authed/projects.$projectId.settings.tsx`

**Changes:**
1. Import category components and queries
2. Add category state management
3. Add new "Categories" section between "General Information" and "Danger Zone"

**New Imports:**
```tsx
import { CategoryList } from "@/components/categories/CategoryList";
import { CategoryForm } from "@/components/categories/CategoryForm";
import type { Doc } from "@/convex/dataModel";
```

**New State:**
```tsx
const [isCreatingCategory, setIsCreatingCategory] = useState(false);
const [editingCategory, setEditingCategory] = useState<Doc<"categories"> | null>(null);
const [showCategoryDeleteConfirm, setShowCategoryDeleteConfirm] = useState(false);
const [categoryToDelete, setCategoryToDelete] = useState<Id<"categories"> | null>(null);

const categories = useQuery(api.categories.listCategories, {
  projectId: projectId as Id<"projects">,
});
const deleteCategory = useMutation(api.categories.deleteCategory);
const updateCategoryOrder = useMutation(api.categories.updateCategoryOrder);
```

**New Section (insert after General Information section):**
```tsx
{/* Categories Section */}
<section className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Content Categories</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Organize your content with custom categories. Drag to reorder.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setIsCreatingCategory(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
      >
        Add Category
      </button>
    </div>
  </div>

  <div className="p-6">
    {categories === undefined ? (
      <LoadingState message="Loading categories..." />
    ) : categories.length === 0 ? (
      <EmptyState
        title="No categories yet"
        description="Create your first category to start organizing content."
        actionLabel="Add Category"
        onAction={() => setIsCreatingCategory(true)}
      />
    ) : (
      <CategoryList
        categories={categories}
        onCreate={() => setIsCreatingCategory(true)}
        onEdit={setEditingCategory}
        onDelete={(categoryId) => {
          setCategoryToDelete(categoryId);
          setShowCategoryDeleteConfirm(true);
        }}
        onReorder={async (orderedIds) => {
          await updateCategoryOrder({ categoryIds: orderedIds });
        }}
      />
    )}
  </div>
</section>

{/* Category Create/Edit Modal */}
{(isCreatingCategory || editingCategory) && (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex min-h-screen items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => {
          setIsCreatingCategory(false);
          setEditingCategory(null);
        }}
      />

      <div className="relative transform overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
        <div className="px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            {editingCategory ? "Edit Category" : "Create Category"}
          </h3>
          <CategoryForm
            projectId={projectId}
            category={editingCategory ?? undefined}
            onSuccess={() => {
              setIsCreatingCategory(false);
              setEditingCategory(null);
            }}
            onCancel={() => {
              setIsCreatingCategory(false);
              setEditingCategory(null);
            }}
          />
        </div>
      </div>
    </div>
  </div>
)}

{/* Category Delete Confirmation */}
<ConfirmDialog
  isOpen={showCategoryDeleteConfirm}
  title="Delete Category"
  message="Are you sure you want to delete this category? This will also delete all associated content, knowledge base items, and examples."
  variant="danger"
  onConfirm={async () => {
    if (categoryToDelete) {
      await deleteCategory({ categoryId: categoryToDelete });
      setShowCategoryDeleteConfirm(false);
      setCategoryToDelete(null);
    }
  }}
  onCancel={() => {
    setShowCategoryDeleteConfirm(false);
    setCategoryToDelete(null);
  }}
/>
```

**Import Dependencies:**
```tsx
import { EmptyState } from "@/components/shared/EmptyState";
```

---

### 9. Delete Obsolete Files

**Files to DELETE:**

1. **Route Files:**
   - `src/routes/_authed/projects.$projectId.categories.tsx`
   - `src/routes/_authed/projects.$projectId.brand-voices.tsx`
   - `src/routes/_authed/projects.$projectId.personas.tsx`
   - `src/routes/_authed/projects.$projectId.knowledge-base.tsx`
   - `src/routes/_authed/projects.$projectId.examples.tsx`

2. **Component Files:**
   - `src/components/project/ProjectSidebar.tsx`

**Commands:**
```bash
rm src/routes/_authed/projects.\$projectId.categories.tsx
rm src/routes/_authed/projects.\$projectId.brand-voices.tsx
rm src/routes/_authed/projects.\$projectId.personas.tsx
rm src/routes/_authed/projects.\$projectId.knowledge-base.tsx
rm src/routes/_authed/projects.\$projectId.examples.tsx
rm src/components/project/ProjectSidebar.tsx
```

**Note:** TanStack Router will auto-regenerate `routeTree.gen.ts` when dev server restarts.

---

### 10. Type Check & Testing

**Run checks:**
```bash
bun check
```

**Fix common issues:**
- Unused imports (remove `ProjectSidebar` import from `ProjectLayout.tsx`)
- Type mismatches in new modal components
- Missing dependencies in package.json (unlikely)

**Manual testing checklist:**
- [ ] Header buttons appear on desktop, dropdown on mobile
- [ ] Each modal opens and closes correctly
- [ ] Frosted glass effect visible on modals
- [ ] Categories appear in Settings page
- [ ] Drag-and-drop reordering works for categories
- [ ] Create/edit/delete works for all config options
- [ ] Dark mode works correctly for all new components

---

## File Structure Changes

### Files to CREATE (5):
```
src/components/shared/Modal.tsx
src/components/brand-voices/BrandVoicesModal.tsx
src/components/personas/PersonasModal.tsx
src/components/knowledge-base/KnowledgeBaseModal.tsx
src/components/examples/ExamplesModal.tsx
```

### Files to MODIFY (3):
```
src/components/project/ProjectLayout.tsx
src/components/project/ProjectHeader.tsx
src/routes/_authed/projects.$projectId.settings.tsx
```

### Files to DELETE (6):
```
src/components/project/ProjectSidebar.tsx
src/routes/_authed/projects.$projectId.categories.tsx
src/routes/_authed/projects.$projectId.brand-voices.tsx
src/routes/_authed/projects.$projectId.personas.tsx
src/routes/_authed/projects.$projectId.knowledge-base.tsx
src/routes/_authed/projects.$projectId.examples.tsx
```

---

## Design System Notes

### Frosted Glass Effect

**Backdrop:**
```css
bg-black/40 backdrop-blur-sm
```

**Modal Panel:**
```css
bg-white/80 dark:bg-slate-900/80
backdrop-blur-xl
border border-white/20 dark:border-slate-700/50
shadow-2xl
rounded-2xl
```

**Header:**
```css
border-b border-slate-200/50 dark:border-slate-700/50
```

### Button Styles

**Primary (Cyan):**
```css
bg-cyan-600 hover:bg-cyan-700
text-white
rounded-md
px-4 py-2
transition-colors
focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500
```

**Secondary (Outline):**
```css
bg-white dark:bg-slate-800
border border-slate-300 dark:border-slate-700
text-slate-700 dark:text-slate-300
hover:bg-slate-50 dark:hover:bg-slate-700
rounded-md
px-4 py-2
```

### Mobile Dropdown

Use `@headlessui/react` Menu component or custom implementation with:
- Toggle button with chevron icon
- Absolute positioned dropdown
- Slide-down animation
- Close on outside click

---

## Migration Notes

### Routing Changes

**Before:**
- `/projects/:id/categories` → Full page
- `/projects/:id/brand-voices` → Full page
- `/projects/:id/personas` → Full page
- `/projects/:id/knowledge-base` → Full page
- `/projects/:id/examples` → Full page

**After:**
- `/projects/:id/settings` → Includes categories
- All others → Modals (no routes)

### Deep Linking

If deep linking to config pages was important, consider adding query params:
- `/projects/:id?modal=brand-voices`
- `/projects/:id?modal=personas`

This can be implemented later if needed.

### Component Reuse

All existing list and form components can be reused:
- `BrandVoiceList`, `BrandVoiceForm`
- `PersonaList`, `PersonaForm`
- `CategoryList`, `CategoryForm`
- `KnowledgeBaseList`, `KnowledgeBaseItemForm`
- `ExamplesList`, `ExampleForm`

Only the route/page wrappers are being replaced with modals.

---

## Estimated Complexity

- **Phase 1 (Modal):** Easy - Single reusable component
- **Phase 2 (Header/Layout):** Medium - UI restructuring
- **Phase 3 (Config Modals):** Easy - Repetitive pattern
- **Phase 4 (Settings):** Medium - Embedding category management
- **Phase 5 (Cleanup):** Easy - File deletion

**Total Time Estimate:** 2-3 hours for complete implementation

---

## Success Criteria

- [ ] No sidebar visible on any project page
- [ ] Header has config buttons on desktop
- [ ] Header has dropdown on mobile
- [ ] All 4 config modals open and function correctly
- [ ] Modals use frosted glass effect
- [ ] Categories visible and manageable in Settings
- [ ] No TypeScript errors
- [ ] Dark mode works correctly
- [ ] Responsive on all screen sizes
