# Product Mission

## Pitch

PostMate is a multi-tenant content management and AI-powered generation platform that helps content creators, marketing professionals, and agencies produce consistent, high-quality social media content by providing intelligent content generation with brand voice preservation, persona targeting, and comprehensive version control.

## Users

### Primary Customers

- **Content Creators**: Bloggers and social media managers who need to produce consistent, high-volume content across multiple platforms
- **Marketing Professionals**: Teams that must maintain brand voice consistency across LinkedIn, Instagram, X, and blog content
- **Small Business Owners**: Entrepreneurs who want professional content without hiring dedicated writers
- **Freelance Writers**: Writers managing multiple clients and projects with different voices and audiences
- **Agencies**: Marketing agencies managing content for multiple brands and clients simultaneously

### User Personas

**Marketing Manager** (28-45)
- **Role:** Marketing team lead at mid-size company
- **Context:** Responsible for content strategy across multiple social platforms
- **Pain Points:** Inconsistent brand voice across team members, time-consuming content creation, difficulty repurposing content for different platforms
- **Goals:** Streamline content production, maintain brand consistency, enable team collaboration

**Freelance Content Writer** (25-40)
- **Role:** Independent contractor managing 5-10 clients
- **Context:** Needs to quickly switch between different brand voices and audience types
- **Pain Points:** Keeping track of each client's preferences, managing multiple style guides, version tracking across revisions
- **Goals:** Increase throughput without sacrificing quality, deliver consistent voice for each client

**Small Business Owner** (30-55)
- **Role:** Founder or CEO handling own marketing
- **Context:** Limited time and budget for content creation
- **Pain Points:** Writing does not come naturally, lacks time to create consistent content, struggles with platform-specific formats
- **Goals:** Professional social presence with minimal time investment, content that sounds authentic to their voice

**Agency Account Manager** (26-38)
- **Role:** Manages content production for agency clients
- **Context:** Oversees content for 3-5 brands with different voices and audiences
- **Pain Points:** Context switching between brands, maintaining separate knowledge bases, tracking client approvals
- **Goals:** Efficient multi-client management, clear content organization, easy client handoffs

## The Problem

### Content Creation Bottleneck

Creating consistent, high-quality content across multiple social media platforms is time-consuming and error-prone. A single piece of content often needs adaptation for different platforms (blog, LinkedIn, X, Instagram), each with unique format constraints and audience expectations.

**Our Solution:** PostMate provides an AI-powered content wizard that generates drafts using your brand voice, target persona, and reference materials. Derived content creation enables one-click repurposing across platforms while maintaining consistency.

### Brand Voice Inconsistency

Organizations struggle to maintain consistent brand voice across team members, content types, and platforms. Style guides exist but are rarely followed consistently.

**Our Solution:** Brand voice definitions are stored as first-class entities with supporting documents. Every content generation incorporates the selected brand voice, ensuring consistency regardless of who initiates content creation.

### Knowledge Fragmentation

Reference materials, successful examples, and brand guidelines are scattered across drives, documents, and team members' heads. This fragmentation leads to inconsistent content and duplicated effort.

**Our Solution:** Project-level knowledge bases and example libraries organize reference materials by content category. AI generation automatically incorporates relevant context, ensuring institutional knowledge is applied consistently.

## Differentiators

### Project-Based Multi-Tenancy with Deep Organization

Unlike generic AI writing tools that offer flat document storage, PostMate provides a hierarchical organization (Workspace > Projects > Categories) that mirrors how content teams actually work. Each project maintains its own brand voices, personas, knowledge base, and examples, enabling true multi-client management.

### Context-Rich AI Generation

Unlike simple prompt-to-content tools, PostMate incorporates multiple context sources (knowledge base, examples, brand voice, persona) into every generation. This produces drafts that require less editing and maintain consistency with existing content.

### First-Class Version Control

Unlike content management systems that overwrite previous versions, PostMate preserves complete version history with diff comparison and rollback capabilities. Multiple finalized versions (v1, v2, v3) can exist under a single content piece, tracking the evolution of content over time.

### Integrated Derived Content Workflow

Unlike platforms requiring manual copy-paste between content types, PostMate enables creating derived content directly from any piece. The system adapts content to target format constraints while maintaining a parent-child relationship for traceability.

## Key Features

### Core Features

- **User Workspace Management:** Isolated workspace per user containing all projects, settings, and content
- **Project Management:** Create and manage multiple projects with dashboards showing content overview and recent activity
- **Category Management:** Pre-configured content types (Blog Post, LinkedIn Article, LinkedIn Post, Instagram Post, X Thread, Case Study) plus custom categories with format guidelines

### Content Organization

- **Knowledge Base:** Upload reference materials (text, Word, PDF, images) per category as context for AI generation
- **Examples Library:** Store successful content examples for style imitation during generation
- **Brand Voices:** Define multiple brand voices per project via uploaded documents or direct text input
- **Personas:** Create target audience definitions that guide content tone and messaging

### Content Creation

- **Content Creation Wizard:** Step-by-step guided flow from content type selection through AI generation
- **AI-Powered Draft Generation:** Intelligent drafts using LLM providers with knowledge base, examples, brand voice, and persona context
- **Manual and AI-Assisted Editing:** Rich text editor with alongside LLM chat panel for AI-assisted revisions
- **Image Generation:** Create image prompts for infographics, illustrations, and photos via DALL-E or Google Imagen

### Content Management

- **Version Control:** Complete history with diff comparison and version restoration
- **Content Finalization Workflow:** Mark content as finalized with support for multiple finalized versions
- **Derived Content Creation:** Generate adapted content for different platforms while maintaining parent relationship
- **Content Archive:** Filterable list view with search across all content, knowledge base, and examples
