# Foundation & Core Data Spec

## Summary

This spec covers the foundational data layer and core data management features for PostMate (roadmap items 1-8). These features establish the database schema and primary entities that all other features will build upon.

## Features Included

### 1. Convex Schema Foundation
Define the complete database schema for all core entities:
- Workspaces (user-level container)
- Projects (organizational unit for content)
- Categories (content types with format guidelines)
- Brand Voices (tone/style definitions with supporting documents)
- Personas (target audience definitions)
- Knowledge Base Items (reference materials per category)
- Examples (successful content samples for style imitation)
- File attachments (documents, images linked to entities)

Establish relationships, indexes, and constraints between entities.

### 2. Workspace and Project Management
- Automatic workspace creation on user sign-up
- Project CRUD operations (create, read, update, delete)
- Project dashboard with overview cards
- Recent activity feed per project
- Project settings page

### 3. Category Management
- Six default content types pre-configured:
  - Blog Post
  - LinkedIn Article
  - LinkedIn Post
  - Instagram Post
  - X Thread
  - Case Study
- Custom category creation with name, description, and format guidelines
- Category editing and deletion
- Category list view within project settings

### 4. Brand Voice Management
- Brand voice CRUD operations
- Support for multiple documents per brand voice
- File upload support (Word, PDF, text files)
- Direct text input option for voice definition
- Text parsing and storage for AI context injection
- Brand voice list and detail views

### 5. Persona Management
- Persona CRUD operations
- Document upload support (Word, PDF)
- Free-text input for persona descriptions
- Per-project persona definitions
- Structured storage for AI consumption
- Persona list and detail views

### 6. Knowledge Base
- Knowledge base item management per category
- File upload support: text, Word, PDF, images (up to 15MB)
- Free-text knowledge items
- Text parsing from documents
- Storage optimized for AI context retrieval
- Knowledge base list view with preview

### 7. Examples Library
- Examples management per category
- Add successful content samples
- Support for file upload and direct text input
- Examples used for style imitation during AI generation
- Examples list view with preview

### 8. File Upload Infrastructure
- Reusable file upload components
- 15MB file size limit validation (client and server)
- Support for Word, PDF, text, and image formats
- Cloudflare R2 storage integration (or equivalent)
- File metadata tracking
- Secure file retrieval

## Technical Context

**Existing Setup:**
- Convex schema already has a `users` table with Clerk integration
- Authentication is configured with Clerk
- TanStack Start with file-based routing in place
- Cloudflare Workers deployment configured
- Basic route structure exists (_authed layout, dashboard, profile)

**Dependencies:**
- This spec must be completed before content creation wizard (item 9)
- File upload infrastructure is needed by brand voice, persona, knowledge base, and examples features
