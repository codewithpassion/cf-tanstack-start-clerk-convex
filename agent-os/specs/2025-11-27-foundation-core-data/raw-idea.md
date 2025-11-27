# Foundation & Core Data - Raw Idea

This spec combines roadmap items 1-8 to establish the foundational data layer for PostMate:

1. **Convex Schema Foundation** - Database schema for workspaces, projects, categories, brand voices, personas, knowledge base items, examples, and versions with relationships and indexes.

2. **Workspace and Project Management** - Workspace creation on sign-up, project CRUD, project dashboard with overview cards and activity feed.

3. **Category Management** - Six default content types (Blog Post, LinkedIn Article, LinkedIn Post, Instagram Post, X Thread, Case Study) plus custom category creation with format guidelines.

4. **Brand Voice Management** - Brand voice CRUD with document uploads (Word, PDF, text) and direct text input, parsed for AI context.

5. **Persona Management** - Persona CRUD with document upload and free-text input, per-project definitions stored for AI consumption.

6. **Knowledge Base** - Per-category reference materials with file upload (text, Word, PDF, images up to 15MB), text parsing, and AI context storage.

7. **Examples Library** - Per-category successful content samples for style imitation during AI generation.

8. **File Upload Infrastructure** - Reusable upload system with 15MB limit, Word/PDF/text/image support, and Cloudflare R2 storage integration.

These features form the data foundation that all content creation and AI generation features will build upon.
