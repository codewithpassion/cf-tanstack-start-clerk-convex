# Foundation & Core Data - Confirmed Decisions

## Overview

This document records all confirmed design and implementation decisions for the Foundation & Core Data spec, based on the requirements gathering discussion.

---

## Architecture Decisions

### 1. Workspace Model
**Decision**: 1:1 relationship with user, auto-created on sign-up

- Each user gets exactly one workspace
- Workspace is automatically created when a new user signs up via Clerk
- No workspace switching or sharing in initial implementation
- Workspace serves as the top-level container for all user data

### 2. Category Scope
**Decision**: Project-level categories (each project has its own categories)

- Categories are scoped to individual projects, not shared across workspace
- Each new project starts with 6 default categories pre-populated
- Users can customize, add, or remove categories per project
- Allows different projects to have different content type configurations

### 3. Deletion Strategy
**Decision**: Soft deletes with `deletedAt` timestamp

Applies to:
- Projects
- Brand Voices
- Personas
- Categories

Implementation:
- Add `deletedAt?: number` field to relevant schemas
- Queries filter out items where `deletedAt` is set
- Enables future recovery features if needed
- Maintains referential integrity

---

## Default Data

### 4. Default Categories
**Decision**: Pre-populate 6 categories with format guidelines

Each default category includes character limits and typical length guidance:

| Category | Description |
|----------|-------------|
| Blog Post | Long-form content with typical lengths and structure guidelines |
| LinkedIn Article | Professional long-form with platform-specific recommendations |
| LinkedIn Post | Short-form professional content with character limits |
| Instagram Post | Visual-first content with caption length guidelines |
| X Thread | Multi-post format with per-post character limits |
| Case Study | Structured business content with section guidelines |

Format guidelines will include:
- Character/word count recommendations
- Typical structure elements
- Platform-specific best practices

---

## File Handling

### 5. File Storage
**Decision**: Cloudflare R2 with presigned URLs

- Store original files in Cloudflare R2 bucket
- Generate presigned URLs for secure, time-limited access
- Track file metadata in Convex (filename, size, type, R2 key)
- 15MB maximum file size limit

### 6. Document Text Extraction
**Decision**: Option A - Extract text server-side during upload

Process:
1. User uploads document (Word, PDF, text)
2. Server extracts text content during upload processing
3. Store both original file (in R2) and extracted text (in Convex)
4. Extracted text is immediately available for AI context injection

Benefits:
- Text available instantly when needed for AI generation
- No delay at content creation time
- Original document preserved for reference

---

## User Interface

### 7. Project UI Structure
**Decision**: Three-level navigation hierarchy

**Level 1 - Project Dashboard**:
- Grid of project cards showing overview information
- Quick access to recent projects
- Create new project action

**Level 2 - Project Workspace**:
- Sidebar navigation with sections:
  - Categories
  - Brand Voices
  - Personas
  - Knowledge Base
  - Examples
  - Content
- Main content area for selected section

**Level 3 - Settings**:
- Accessible via gear icon in project workspace
- Project-level configuration options

### 8. Onboarding Flow
**Decision**: Guided wizard with skip option

Steps:
1. Create first project (name, optional description)
2. Add brand voice (upload or text input)
3. Optionally add persona (can skip)
4. Complete onboarding

Features:
- Skip available at each step after project creation
- Clear progress indication
- Can be dismissed and completed later

---

## Validation Rules

### 9. Field Validation Specifications

| Field | Required | Max Length | Notes |
|-------|----------|------------|-------|
| Project name | Yes | 100 chars | |
| Project description | No | 2000 chars | |
| Category name | Yes | 50 chars | |
| Category description | No | 2000 chars | |
| Brand voice name | Yes | 100 chars | |
| Brand voice description | No | 2000 chars | |
| Persona name | Yes | 100 chars | |
| Persona description | No | 2000 chars | |
| File uploads | - | 15MB | Word, PDF, text, images |

---

## Scope Decisions

### 10. Deferred Features
**Activity Feed**: Deferred to a later phase

- Recent activity tracking per project is out of scope for this spec
- Will be addressed in a future enhancement
- Focus on core CRUD operations first

### 11. Codebase Approach
**Decision**: Fresh start, preserve only Clerk auth

- Current codebase is boilerplate only
- Clerk authentication system must be preserved
- All other code can be replaced/restructured as needed
- No existing patterns to reference - building from scratch

---

## Assets & References

### Visual Assets
- **Status**: No visual assets provided
- No mockups, wireframes, or screenshots to reference
- UI implementation will follow standard patterns

### Existing Code to Reference
- **Status**: No existing patterns to reference
- Building from scratch on top of boilerplate
- Only Clerk auth integration carries forward

---

## Summary

All 11 major decisions have been confirmed by the user. The spec is ready for detailed specification writing with clear direction on:

- Data model architecture (workspace, categories, soft deletes)
- Default data population (6 categories with format guidelines)
- File handling approach (R2 storage, server-side text extraction)
- UI structure (dashboard -> workspace -> settings)
- Onboarding flow (guided wizard with skip)
- Validation rules (character limits, file size)
- Scope boundaries (activity feed deferred)
- Implementation context (fresh start, preserve Clerk only)
