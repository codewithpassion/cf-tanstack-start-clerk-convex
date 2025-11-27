# Spec Requirements: Foundation & Core Data

## Initial Description

This spec covers the foundational data layer and core data management features for PostMate (roadmap items 1-8). These features establish the database schema and primary entities that all other features will build upon.

Features included:
1. Convex Schema Foundation - Complete database schema for all core entities
2. Workspace and Project Management - Auto workspace creation, project CRUD, dashboard
3. Category Management - Six default content types, custom category creation
4. Brand Voice Management - CRUD, document upload, text parsing
5. Persona Management - CRUD, document support, per-project definitions
6. Knowledge Base - Per-category items, file uploads, text parsing
7. Examples Library - Per-category samples for style imitation
8. File Upload Infrastructure - Reusable components, R2 storage, 15MB limit

## Requirements Discussion

### First Round Questions

**Q1:** For the workspace model, I assume a 1:1 relationship with users (each user has exactly one workspace, auto-created on sign-up). Is that correct, or do you need multiple workspaces per user or shared team workspaces?
**Answer:** Sounds good - 1:1 with user, auto-created on sign-up

**Q2:** For categories, I'm thinking they should be project-level (each project has its own set of categories, starting with the 6 defaults). Should categories instead be workspace-level (shared across all projects)?
**Answer:** Sounds good - project-level categories with defaults per project

**Q3:** For deletion behavior, I assume soft deletes with a `deletedAt` timestamp for projects, brand voices, personas, and categories. This allows potential recovery. Is hard delete preferred instead?
**Answer:** Sounds good - soft deletes with `deletedAt` timestamp

**Q4:** For the 6 default categories, should they include pre-populated format guidelines (character limits, typical lengths) or just names and descriptions?
**Answer:** Sounds good - pre-populate with format guidelines

**Q5:** For file storage, I assume Cloudflare R2 with presigned URLs for secure access. Is there a different storage preference?
**Answer:** Sounds good - R2 with presigned URLs

**Q6:** For document text extraction (Word, PDF), should we: (A) Extract text server-side during upload and store both original and extracted text, or (B) Extract on-demand when needed for AI context?
**Answer:** Sounds good - Option A, extract server-side during upload

**Q7:** For the project UI, I'm envisioning: Dashboard with project cards -> Project workspace with sidebar (Categories, Brand Voices, Personas, Knowledge Base, Examples, Content) -> Settings via gear icon. Does this navigation structure work?
**Answer:** Sounds good - dashboard with cards, sidebar navigation, gear for settings

**Q8:** For onboarding, should new users go through a guided wizard (create first project, add brand voice, optionally add persona) with skip available, or start directly on an empty dashboard?
**Answer:** Sounds good - guided wizard with skip available

**Q9:** For validation rules, I assume: project/brand voice/persona names required (max 100 chars), category names required (max 50 chars), descriptions optional (max 2000 chars), file uploads max 15MB. Any adjustments needed?
**Answer:** Sounds good - validation rules as specified

**Q10:** Is there anything that should explicitly NOT be included in this foundation spec, or any features you want to ensure are deferred to later phases?
**Answer:** Activity feed deferred to later phase

### Existing Code to Reference

**Similar Features Identified:**
- No existing patterns to reference
- Current codebase is boilerplate only
- Clerk authentication system is the only component to preserve

User confirmed: "The current codebase is just boilerplate - only the Clerk auth system needs to be preserved"

### Follow-up Questions

No follow-up questions were needed - all initial questions received clear confirmation.

## Visual Assets

### Files Provided:
No visual files found in `/home/roboto/devel/postmate/agent-os/specs/2025-11-27-foundation-core-data/planning/visuals/`

### Visual Insights:
No visual assets provided. UI implementation will follow standard patterns based on the described navigation structure.

## Requirements Summary

### Functional Requirements

**Data Model:**
- Workspace entity with 1:1 user relationship, auto-created on sign-up
- Project entity as organizational container within workspace
- Category entity at project level with 6 defaults including format guidelines
- Brand Voice entity with document support and text extraction
- Persona entity with document support and text extraction
- Knowledge Base items per category with file and text support
- Examples per category for style imitation
- File metadata tracking for all uploads

**User Operations:**
- Project CRUD (create, read, update, soft delete)
- Category CRUD with default population on project creation
- Brand Voice CRUD with file upload and text input
- Persona CRUD with file upload and text input
- Knowledge Base item management per category
- Examples management per category
- File upload with 15MB limit and text extraction

**User Interface:**
- Project dashboard with card grid
- Project workspace with sidebar navigation
- Settings accessible via gear icon
- Guided onboarding wizard with skip option

### Reusability Opportunities

Since this is a fresh start on boilerplate:
- Build reusable file upload component for use across brand voices, personas, knowledge base, examples
- Create shared form patterns for entity CRUD operations
- Establish consistent sidebar navigation pattern for project workspace
- Design soft delete utility functions for reuse

### Scope Boundaries

**In Scope:**
- Complete Convex schema for all core entities
- Workspace auto-creation on user sign-up
- Project CRUD with dashboard view
- Category management with 6 defaults and format guidelines
- Brand Voice CRUD with document upload and text extraction
- Persona CRUD with document upload and text extraction
- Knowledge Base management per category
- Examples management per category
- File upload infrastructure with R2 and presigned URLs
- Guided onboarding wizard
- Project workspace UI with sidebar navigation

**Out of Scope:**
- Activity feed / recent activity tracking (deferred)
- Team/shared workspaces
- Workspace switching
- Hard delete functionality
- Content creation wizard (separate spec)
- AI integration (separate spec)

### Technical Considerations

**Stack:**
- Convex for database and backend functions
- Cloudflare R2 for file storage
- Clerk for authentication (preserve existing)
- TanStack Start for routing and SSR
- React 19 for UI components

**Integration Points:**
- Clerk user sync to create workspace on sign-up
- R2 presigned URL generation for secure file access
- Text extraction service for Word/PDF documents

**Constraints:**
- Cloudflare Workers runtime (no Node.js APIs)
- 15MB file size limit
- Soft deletes require filtering in all queries

**Validation Rules:**
| Field | Required | Max Length |
|-------|----------|------------|
| Project name | Yes | 100 chars |
| Category name | Yes | 50 chars |
| Brand voice name | Yes | 100 chars |
| Persona name | Yes | 100 chars |
| All descriptions | No | 2000 chars |
| File uploads | - | 15MB |
