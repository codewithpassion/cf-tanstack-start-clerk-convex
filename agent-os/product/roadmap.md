# Product Roadmap

1. [x] Convex Schema Foundation -- Define database schema for workspaces, projects, categories, brand voices, personas, knowledge base items, examples, content pieces, and versions. Establish relationships and indexes. `S` ✅ **COMPLETE**

2. [x] Workspace and Project Management -- Implement workspace creation on user sign-up, project CRUD operations, and project dashboard with overview cards and recent activity feed. `M` ✅ **COMPLETE**

3. [x] Category Management -- Build category system with six default content types (Blog Post, LinkedIn Article, LinkedIn Post, Instagram Post, X Thread, Case Study) plus custom category creation with format guidelines. `S` ✅ **COMPLETE**

4. [x] Brand Voice Management -- Create brand voice CRUD with support for document uploads (Word, PDF, text) and direct text input. Store parsed content for AI context injection. `M` ✅ **COMPLETE**

5. [x] Persona Management -- Implement persona CRUD with document upload and free-text input. Enable per-project persona definitions with structured storage for AI consumption. `S` ✅ **COMPLETE**

6. [x] Knowledge Base -- Build knowledge base item management per category with file upload support (text, Word, PDF, images up to 15MB), text parsing, and storage for AI context. `M` ✅ **COMPLETE**

7. [x] Examples Library -- Implement examples management per category allowing users to add successful content samples that will be used for style imitation during generation. `S` ✅ **COMPLETE**

8. [x] File Upload Infrastructure -- Create reusable file upload system with 15MB limit validation, support for Word/PDF/text/image formats, and Cloudflare R2 or equivalent storage integration. `M` ✅ **COMPLETE**

9. [ ] Content Creation Wizard UI -- Build step-by-step wizard flow: content type selection, persona selection, brand voice selection, title/topic input, optional draft content, source material upload, and review screen. `L`

10. [ ] AI SDK Integration -- Integrate @ai-sdk with OpenAI and Anthropic providers. Create abstraction layer for model selection and streaming responses with progress indicators. `M`

11. [ ] AI Draft Generation -- Implement content generation endpoint that assembles context (knowledge base, examples, brand voice, persona) and generates initial draft via LLM with streaming output. `L`

12. [ ] Block-Based Markdown Editor -- Integrate Novel (Notion-style editor) for content editing with slash commands, markdown shortcuts, drag-and-drop blocks, autosave after 3 seconds of inactivity, and responsive layout. `M`

13. [ ] AI Chat Panel -- Build collapsible, resizable chat panel alongside editor for AI-assisted revisions. Enable contextual suggestions based on current content state. `M`

14. [ ] Version Control System -- Implement automatic version creation on every save. Store complete content snapshots with timestamps and enable version history listing. `M`

15. [ ] Version Diff and Restore -- Build version comparison view showing differences between any two versions. Implement restore functionality that creates new version from historical content. `M`

16. [ ] Content Finalization Workflow -- Add finalization status to content pieces. Support multiple finalized versions (v1, v2, v3) with distinct states and timestamps. `S`

17. [ ] Derived Content Creation -- Implement derived content generation from existing pieces. Enable target category selection with format adaptation while maintaining parent-child relationship. `M`

18. [ ] Image Prompt Wizard -- Build wizard for generating image prompts with support for infographics, illustrations, and photos. Guide users through describing desired visual elements. `S`

19. [ ] Image Generation Integration -- Integrate DALL-E and/or Google Imagen APIs. Implement sequential image generation with preview, selection, and attachment to content pieces. `M`

20. [ ] Image Upload and Management -- Enable direct image upload (15MB limit) with attachment to content pieces. Build image gallery view within content editor. `S`

21. [ ] Content Archive View -- Create filterable list view of all content with filters for content type, persona, brand voice, date range, and status. Implement sortable columns. `M`

22. [ ] Search Functionality -- Build instant search across content, knowledge base, and examples within project or across all projects. Include result highlighting and ranking. `M`

23. [ ] Dashboard Enhancements -- Add recent activity feed, quick action buttons (create content, create project), and project overview cards with content statistics. `S`

24. [ ] Dark Mode Support -- Implement theme toggle with light and dark mode support across all UI components using Tailwind CSS dark mode utilities. `S`

25. [ ] Responsive Design Polish -- Ensure all views work well on tablet and mobile devices. Optimize editor and chat panel layout for smaller screens. `M`

26. [ ] Error Handling and Loading States -- Add comprehensive error handling with user-friendly messages, confirmation dialogs for destructive actions, and loading indicators for all async operations. `S`

27. [ ] Performance Optimization -- Optimize database queries, implement pagination for large lists, add caching where appropriate, and ensure smooth AI streaming experience. `M`

> Notes
> - Order reflects technical dependencies (schema before features, upload infrastructure before knowledge base)
> - Each item represents an end-to-end functional and testable feature
> - AI features (items 10-13) form a cohesive unit that enables core value proposition
> - Version control (items 14-16) builds incrementally from basic to advanced
> - Polish items (24-27) are grouped at end but can be partially addressed earlier
