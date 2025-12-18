# AI Module Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring of `src/server/ai.ts` (1,717 lines) into a well-architected, maintainable system using SOLID principles, DRY patterns, and service-oriented design.

---

## Part 1: Current State Analysis

### 1.1 SOLID Violations

#### Single Responsibility Principle (SRP) Violations

The `ai.ts` file currently handles **7 distinct responsibilities**:

1. **Authentication** - Getting authenticated Convex client
2. **Context Assembly** - Fetching category, persona, brand voice, knowledge base, examples
3. **Prompt Construction** - Building system and user prompts
4. **AI Provider Management** - Configuring and creating AI providers
5. **Billing Operations** - Balance checks, token estimation, usage recording
6. **AI Execution** - Streaming/generating text
7. **Error Handling** - Catching and formatting errors

Each server function (`generateDraft`, `refineContent`, `refineSelection`, `generateChatResponse`, `repurposeContent`, `generateImagePrompt`) duplicates ALL of these responsibilities.

#### Open/Closed Principle (OCP) Violations

- Adding a new AI operation requires copying 100+ lines of boilerplate
- Changing billing logic requires modifying 7+ locations
- Prompt format changes require updates across multiple functions

#### Dependency Inversion Principle (DIP) Violations

- Server functions directly instantiate dependencies (Convex client, AI provider)
- No dependency injection - hard to test or swap implementations
- High-level operations depend on low-level implementation details

### 1.2 DRY Violations

#### Pattern 1: Authentication & User/Workspace Fetch (Repeated 7x)

```typescript
const convex = await getAuthenticatedConvexClient();
const user = await convex.query(api.users.getMe);
if (!user) throw new Error("User not found");
const workspace = await convex.query(api.workspaces.getMyWorkspace);
if (!workspace) throw new Error("Workspace not found");
```

#### Pattern 2: AI Configuration Setup (Repeated 7x)

```typescript
const env = getAIEnvironment();
const aiConfig = resolveAIConfig(env, {
  defaultAiProvider: project.defaultAiProvider,
  defaultAiModel: project.defaultAiModel,
});
const model = createAIProvider(aiConfig, env);
```

#### Pattern 3: Balance Check (Repeated 7x)

```typescript
const estimatedTokens = Math.ceil(estimatedPromptTokens * 1.5 * 2);
const balanceCheck = await convex.query(api.billing.accounts.checkBalance, {
  userId: user._id,
  requiredTokens: estimatedTokens,
});
if (!balanceCheck.sufficient) {
  throw new Error(`Insufficient token balance...`);
}
```

#### Pattern 4: Usage Tracking (Repeated 7x)

```typescript
(async () => {
  try {
    const usage = await result.usage;
    if (usage) {
      const billing = calculateLLMBillableTokens(...);
      await convex.mutation(api.billing.usage.recordUsage, { ... });
    }
  } catch (error) {
    console.error("Failed to record token usage:", error);
  }
})();
```

#### Pattern 5: Error Handling (Repeated 7x)

```typescript
} catch (error) {
  console.error("...", error);
  const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
  throw new Error(`Failed to ...: ${errorMessage}. Please...`);
}
```

### 1.3 Prompt Quality Issues

Current prompts use simple string concatenation:

```typescript
const systemParts: string[] = [
  "You are an expert content writer helping to create high-quality content.",
];
if (context.formatGuidelines) {
  systemParts.push(`\nFORMAT GUIDELINES:\n${context.formatGuidelines}`);
}
```

**Problems:**
- No structured format (XML tags) that Claude excels at parsing
- Instructions scattered throughout instead of clearly delineated
- Examples not properly formatted
- No clear task/output format specification
- Missing Claude-specific best practices (thinking, reasoning structure)

---

## Part 2: Proposed Architecture

### 2.1 Directory Structure

```
src/server/
├── ai/
│   ├── index.ts                          # Public API re-exports
│   │
│   ├── core/
│   │   ├── types.ts                      # All shared types/interfaces
│   │   ├── errors.ts                     # Custom error classes
│   │   └── constants.ts                  # Token limits, defaults
│   │
│   ├── context/
│   │   ├── types.ts                      # Context-specific types
│   │   ├── ContextRepository.ts          # Data fetching (Repository Pattern)
│   │   └── ContextAssembler.ts           # Context composition
│   │
│   ├── prompts/
│   │   ├── PromptBuilder.ts              # XML prompt builder (Builder Pattern)
│   │   ├── types.ts                      # Prompt-related types
│   │   └── strategies/
│   │       ├── IPromptStrategy.ts        # Strategy interface
│   │       ├── DraftPromptStrategy.ts
│   │       ├── ChatPromptStrategy.ts
│   │       ├── RefinePromptStrategy.ts
│   │       ├── SelectionRefinePromptStrategy.ts
│   │       ├── RepurposePromptStrategy.ts
│   │       └── ImagePromptStrategy.ts
│   │
│   ├── billing/
│   │   ├── types.ts
│   │   ├── BillingService.ts             # Balance & usage operations
│   │   └── TokenEstimator.ts             # Token counting utilities
│   │
│   ├── execution/
│   │   ├── types.ts
│   │   ├── AIExecutor.ts                 # AI SDK wrapper
│   │   └── StreamingExecutor.ts          # Streaming-specific logic
│   │
│   ├── services/
│   │   ├── BaseAIService.ts              # Abstract base (Template Method)
│   │   ├── DraftGenerationService.ts
│   │   ├── ChatService.ts
│   │   ├── ContentRefineService.ts
│   │   ├── SelectionRefineService.ts
│   │   ├── RepurposeService.ts
│   │   └── ImagePromptService.ts
│   │
│   └── server-functions/
│       ├── index.ts                      # All exports
│       └── handlers.ts                   # Thin server function wrappers
│
├── ai.ts                                 # Legacy re-exports (backwards compat)
└── ...
```

### 2.2 Design Patterns Applied

#### Template Method Pattern - BaseAIService

The common flow for all AI operations:

```
1. Authenticate & get user context
2. Fetch operation-specific data
3. Assemble generation context
4. Build prompts
5. Check balance
6. Execute AI operation
7. Track usage
8. Return result
```

```typescript
// src/server/ai/services/BaseAIService.ts

export abstract class BaseAIService<TInput, TOutput> {
  constructor(
    protected readonly contextRepository: ContextRepository,
    protected readonly billingService: BillingService,
    protected readonly aiExecutor: AIExecutor,
  ) {}

  /**
   * Template method - defines the algorithm skeleton
   */
  async execute(input: TInput, authContext: AuthContext): Promise<TOutput> {
    // Step 1: Validate input (hook - optional override)
    this.validateInput(input);

    // Step 2: Fetch operation-specific data (abstract - must override)
    const operationData = await this.fetchOperationData(input, authContext);

    // Step 3: Assemble context (hook - optional override)
    const context = await this.assembleContext(input, operationData, authContext);

    // Step 4: Build prompts (abstract - must override)
    const prompts = this.buildPrompts(input, context, operationData);

    // Step 5: Check balance
    await this.billingService.checkBalance(
      authContext.userId,
      this.estimateTokens(prompts),
    );

    // Step 6: Execute (abstract - streaming vs non-streaming)
    const result = await this.executeAI(prompts, operationData);

    // Step 7: Track usage (async, non-blocking)
    this.trackUsage(result, authContext, operationData);

    // Step 8: Return result
    return this.formatOutput(result);
  }

  // Abstract methods - must be implemented by subclasses
  protected abstract fetchOperationData(input: TInput, auth: AuthContext): Promise<OperationData>;
  protected abstract buildPrompts(input: TInput, context: GenerationContext, data: OperationData): PromptPair;
  protected abstract executeAI(prompts: PromptPair, data: OperationData): Promise<AIResult>;
  protected abstract formatOutput(result: AIResult): TOutput;

  // Hook methods - can be overridden
  protected validateInput(input: TInput): void {}
  protected async assembleContext(...): Promise<GenerationContext> {
    return this.contextRepository.assembleContext(...);
  }
  protected estimateTokens(prompts: PromptPair): number {
    return TokenEstimator.estimate(prompts.system + prompts.user) * 3;
  }

  // Final method - cannot be overridden
  private trackUsage(result: AIResult, auth: AuthContext, data: OperationData): void {
    // Fire and forget
    this.billingService.recordUsage(result.usage, auth, data).catch(console.error);
  }
}
```

#### Strategy Pattern - Prompt Building

```typescript
// src/server/ai/prompts/strategies/IPromptStrategy.ts

export interface IPromptStrategy<TInput, TContext> {
  buildSystemPrompt(context: TContext): string;
  buildUserPrompt(input: TInput, context: TContext): string;
}

// src/server/ai/prompts/strategies/DraftPromptStrategy.ts

export class DraftPromptStrategy implements IPromptStrategy<DraftInput, GenerationContext> {
  constructor(private readonly builder: PromptBuilder) {}

  buildSystemPrompt(context: GenerationContext): string {
    return this.builder
      .reset()
      .addRole("expert content writer")
      .addTask("Create high-quality content based on the provided context and instructions.")
      .addContext("brand_voice", context.brandVoiceDescription)
      .addContext("persona", context.personaDescription)
      .addContext("format_guidelines", context.formatGuidelines)
      .addKnowledgeBase(context.knowledgeBase)
      .addExamples(context.examples)
      .addOutputFormat("Write the content in markdown format. Do not include explanations.")
      .build();
  }

  buildUserPrompt(input: DraftInput, context: GenerationContext): string {
    return this.builder
      .reset()
      .addSection("title", input.title)
      .addSection("topic", input.topic)
      .addSection("draft", input.draftContent, { optional: true })
      .addInstruction(input.draftContent
        ? "Improve and expand on the provided draft."
        : "Create complete content following the format guidelines.")
      .build();
  }
}
```

#### Builder Pattern - XML Prompt Construction

```typescript
// src/server/ai/prompts/PromptBuilder.ts

export class PromptBuilder {
  private parts: string[] = [];

  reset(): this {
    this.parts = [];
    return this;
  }

  addRole(role: string): this {
    this.parts.push(`<role>\nYou are an ${role}.\n</role>`);
    return this;
  }

  addTask(task: string): this {
    this.parts.push(`<task>\n${task}\n</task>`);
    return this;
  }

  addContext(name: string, content?: string): this {
    if (content) {
      this.parts.push(`<context name="${name}">\n${content}\n</context>`);
    }
    return this;
  }

  addKnowledgeBase(items: Array<{ title: string; content: string }>): this {
    if (items.length > 0) {
      const itemsXml = items
        .map(item => `  <item title="${item.title}">\n${item.content}\n  </item>`)
        .join("\n");
      this.parts.push(`<knowledge_base>\n${itemsXml}\n</knowledge_base>`);
    }
    return this;
  }

  addExamples(examples: Array<{ title: string; content: string }>): this {
    if (examples.length > 0) {
      const examplesXml = examples
        .map(ex => `  <example title="${ex.title}">\n${ex.content}\n  </example>`)
        .join("\n");
      this.parts.push(`<examples>\n${examplesXml}\n</examples>`);
    }
    return this;
  }

  addSection(name: string, content?: string, opts?: { optional?: boolean }): this {
    if (content || !opts?.optional) {
      this.parts.push(`<${name}>\n${content || ""}\n</${name}>`);
    }
    return this;
  }

  addInstruction(instruction: string): this {
    this.parts.push(`<instruction>\n${instruction}\n</instruction>`);
    return this;
  }

  addOutputFormat(format: string): this {
    this.parts.push(`<output_format>\n${format}\n</output_format>`);
    return this;
  }

  addConstraints(constraints: string[]): this {
    if (constraints.length > 0) {
      const constraintsXml = constraints.map(c => `  <constraint>${c}</constraint>`).join("\n");
      this.parts.push(`<constraints>\n${constraintsXml}\n</constraints>`);
    }
    return this;
  }

  build(): string {
    return this.parts.join("\n\n");
  }
}
```

#### Repository Pattern - Context Fetching

```typescript
// src/server/ai/context/ContextRepository.ts

export class ContextRepository {
  constructor(private readonly convex: ConvexHttpClient) {}

  async getCategory(categoryId: Id<"categories">): Promise<Category | null> {
    return this.convex.query(api.categories.getCategory, { categoryId });
  }

  async getPersona(personaId: Id<"personas">): Promise<Persona | null> {
    return this.convex.query(api.personas.getPersona, { personaId });
  }

  async getBrandVoice(brandVoiceId: Id<"brandVoices">): Promise<BrandVoice | null> {
    return this.convex.query(api.brandVoices.getBrandVoice, { brandVoiceId });
  }

  async getKnowledgeBase(
    categoryId: Id<"categories">,
    selectedIds?: Id<"knowledgeBaseItems">[],
    limit = 10,
  ): Promise<KnowledgeBaseItem[]> {
    const items = await this.convex.query(api.knowledgeBase.listKnowledgeBaseItems, { categoryId });
    const filtered = selectedIds?.length
      ? items.filter(item => selectedIds.includes(item._id))
      : items;
    return filtered.slice(0, limit);
  }

  async getExamples(categoryId: Id<"categories">, limit = 5): Promise<Example[]> {
    const examples = await this.convex.query(api.examples.listExamples, { categoryId });
    return examples.slice(0, limit);
  }

  /**
   * Fetch all context in parallel for efficiency
   */
  async assembleContext(params: AssembleContextParams): Promise<GenerationContext> {
    const [category, persona, brandVoice, knowledgeBase, examples] = await Promise.all([
      this.getCategory(params.categoryId),
      params.personaId ? this.getPersona(params.personaId) : null,
      params.brandVoiceId ? this.getBrandVoice(params.brandVoiceId) : null,
      this.getKnowledgeBase(params.categoryId, params.selectedKnowledgeBaseIds),
      this.getExamples(params.categoryId),
    ]);

    return {
      formatGuidelines: category?.formatGuidelines,
      personaDescription: persona?.description,
      brandVoiceDescription: brandVoice?.description,
      knowledgeBase: knowledgeBase.map(k => ({ title: k.title, content: k.content || "" })),
      examples: examples.map(e => ({ title: e.title, content: e.content || "" })),
    };
  }
}
```

#### Service Layer - BillingService

```typescript
// src/server/ai/billing/BillingService.ts

export class BillingService {
  constructor(
    private readonly convex: ConvexHttpClient,
    private readonly billingSecret: string,
  ) {}

  async checkBalance(userId: Id<"users">, requiredTokens: number): Promise<void> {
    const result = await this.convex.query(api.billing.accounts.checkBalance, {
      userId,
      requiredTokens,
    });

    if (!result.sufficient) {
      throw new InsufficientBalanceError(result.balance, requiredTokens);
    }
  }

  async recordUsage(params: RecordUsageParams): Promise<void> {
    const billing = calculateLLMBillableTokens(
      params.inputTokens,
      params.outputTokens,
    );

    await this.convex.mutation(api.billing.usage.recordUsage, {
      secret: this.billingSecret,
      userId: params.userId,
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      contentPieceId: params.contentPieceId,
      operationType: params.operationType,
      provider: params.provider,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens: billing.actualTokens,
      billableTokens: billing.billableTokens,
      chargeType: "multiplier",
      multiplier: billing.multiplier,
      requestMetadata: JSON.stringify(params.metadata),
      success: true,
    });
  }
}
```

### 2.3 Concrete Service Example

```typescript
// src/server/ai/services/DraftGenerationService.ts

export class DraftGenerationService extends BaseAIService<
  GenerateDraftInput,
  Response  // Streaming response
> {
  private readonly promptStrategy: DraftPromptStrategy;

  constructor(deps: ServiceDependencies) {
    super(deps.contextRepository, deps.billingService, deps.aiExecutor);
    this.promptStrategy = new DraftPromptStrategy(new PromptBuilder());
  }

  protected async fetchOperationData(
    input: GenerateDraftInput,
    auth: AuthContext,
  ): Promise<DraftOperationData> {
    const contentPiece = await this.contextRepository.getContentPiece(input.contentPieceId);
    const project = await this.contextRepository.getProject(contentPiece.projectId);

    return { contentPiece, project };
  }

  protected async assembleContext(
    input: GenerateDraftInput,
    data: DraftOperationData,
    auth: AuthContext,
  ): Promise<GenerationContext> {
    return this.contextRepository.assembleContext({
      categoryId: input.categoryId,
      personaId: input.personaId,
      brandVoiceId: input.brandVoiceId,
      projectId: data.contentPiece.projectId,
      selectedKnowledgeBaseIds: input.selectedKnowledgeBaseIds,
    });
  }

  protected buildPrompts(
    input: GenerateDraftInput,
    context: GenerationContext,
    data: DraftOperationData,
  ): PromptPair {
    return {
      system: this.promptStrategy.buildSystemPrompt(context),
      user: this.promptStrategy.buildUserPrompt(input, context),
    };
  }

  protected async executeAI(
    prompts: PromptPair,
    data: DraftOperationData,
  ): Promise<StreamingResult> {
    return this.aiExecutor.streamText({
      system: prompts.system,
      prompt: prompts.user,
      temperature: 0.7,
      maxOutputTokens: 4096,
      projectConfig: {
        provider: data.project.defaultAiProvider,
        model: data.project.defaultAiModel,
      },
    });
  }

  protected formatOutput(result: StreamingResult): Response {
    return result.toTextStreamResponse();
  }

  // Override to save prompt to content piece
  protected async beforeExecute(
    prompts: PromptPair,
    data: DraftOperationData,
  ): Promise<void> {
    await this.contextRepository.saveGeneratedPrompt(
      data.contentPiece._id,
      `${prompts.system}\n\n--- USER PROMPT ---\n\n${prompts.user}`,
    );
  }
}
```

### 2.4 Server Function Handlers (Thin Wrappers)

```typescript
// src/server/ai/server-functions/handlers.ts

import { createServerFn } from "@tanstack/react-start";
import { createServiceContainer } from "../container";

export const generateDraft = createServerFn({ method: "POST" })
  .inputValidator((input: GenerateDraftInput) => input)
  .handler(async ({ data }) => {
    const container = await createServiceContainer();
    const service = container.resolve(DraftGenerationService);
    return service.execute(data, container.authContext);
  });

export const refineContent = createServerFn({ method: "POST" })
  .inputValidator((input: RefineContentInput) => input)
  .handler(async ({ data }) => {
    const container = await createServiceContainer();
    const service = container.resolve(ContentRefineService);
    return service.execute(data, container.authContext);
  });

// ... similar for other operations
```

---

## Part 3: Improved Prompts for Claude

### 3.1 XML Structure Best Practices

Claude excels at parsing XML-structured prompts. Here's the recommended structure:

```xml
<role>
You are an expert content writer specializing in creating engaging,
high-quality content for various platforms and audiences.
</role>

<task>
Create content based on the provided context, following the format guidelines
and matching the brand voice. The content should be engaging, accurate, and
ready for publication.
</task>

<context name="brand_voice">
Professional yet approachable. Use active voice. Avoid jargon unless
explaining to experts. Always back claims with evidence.
</context>

<context name="persona">
Write as if you are a seasoned marketing professional with 10+ years of
experience in B2B SaaS. You understand the challenges of growing startups.
</context>

<context name="format_guidelines">
- Use H2 for main sections, H3 for subsections
- Include a compelling introduction hook
- Add a clear call-to-action at the end
- Target length: 800-1200 words
</context>

<knowledge_base>
  <item title="Company Background">
    Founded in 2020, we've helped 500+ companies improve their content strategy.
  </item>
  <item title="Product Features">
    AI-powered content generation, collaborative editing, brand voice consistency.
  </item>
</knowledge_base>

<examples>
  <example title="Blog Post Introduction">
    "In today's fast-paced digital landscape, content isn't just king—it's the
    entire kingdom. Yet 60% of marketers struggle to produce content consistently.
    Here's how to change that."
  </example>
</examples>

<constraints>
  <constraint>Do not make claims without supporting evidence from the knowledge base</constraint>
  <constraint>Maintain consistent tone throughout</constraint>
  <constraint>Include at least 3 actionable takeaways</constraint>
</constraints>

<output_format>
Return the content in markdown format. Do not include meta-commentary or
explanations—only the final content ready for publication.
</output_format>
```

### 3.2 Prompt Strategy Examples

#### Draft Generation Prompt

```typescript
buildSystemPrompt(context: GenerationContext): string {
  return this.builder
    .reset()
    .addRole("expert content writer specializing in creating engaging, high-quality content")
    .addTask(`
Create compelling content based on the provided context. Your content should:
- Follow the format guidelines precisely
- Match the brand voice and persona
- Incorporate relevant knowledge naturally
- Be ready for publication without further editing
    `.trim())
    .addContext("brand_voice", context.brandVoiceDescription)
    .addContext("persona", context.personaDescription)
    .addContext("format_guidelines", context.formatGuidelines)
    .addKnowledgeBase(context.knowledgeBase)
    .addExamples(context.examples)
    .addConstraints([
      "Write in markdown format",
      "Do not include meta-commentary or explanations",
      "Ensure factual accuracy based on provided knowledge",
      "Match the style and tone of the examples",
    ])
    .addOutputFormat("Return only the final content in markdown format.")
    .build();
}
```

#### Content Refinement Prompt

```typescript
buildSystemPrompt(context: GenerationContext): string {
  return this.builder
    .reset()
    .addRole("expert content editor with a keen eye for clarity and engagement")
    .addTask(`
Refine the provided content based on the user's instructions. Maintain:
- The core message and key points
- The overall structure unless asked to change it
- Factual accuracy
- Consistent tone with brand voice
    `.trim())
    .addContext("brand_voice", context.brandVoiceDescription)
    .addContext("format_guidelines", context.formatGuidelines)
    .addConstraints([
      "Preserve markdown formatting",
      "Only modify what the instructions request",
      "Do not add content beyond what's asked",
      "Return only the refined content, no explanations",
    ])
    .addOutputFormat("Return the refined content in the same markdown format as the input.")
    .build();
}

buildUserPrompt(input: RefineInput, context: GenerationContext): string {
  return this.builder
    .reset()
    .addSection("original_content", input.currentContent)
    .addSection("refinement_request", input.instructions)
    .addInstruction("Apply the refinement request to the original content and return the result.")
    .build();
}
```

#### Selection Refinement Prompt (Critical: preserve structure)

```typescript
buildSystemPrompt(context: GenerationContext): string {
  return this.builder
    .reset()
    .addRole("precise content editor")
    .addTask(`
Refine ONLY the selected text portion. This is critical:
- The input is in MARKDOWN format
- PRESERVE the exact markdown structure (headings, lists, formatting)
- If input has '## Heading', keep it as '## Heading' in output
- Only modify the TEXT CONTENT, not the STRUCTURE
- You are refining a SELECTION, not the entire document
    `.trim())
    .addContext("brand_voice", context.brandVoiceDescription)
    .addConstraints([
      "PRESERVE markdown structure exactly (## stays ##, - stays -)",
      "PRESERVE formatting marks (**bold**, *italic*, etc.)",
      "Return content in the SAME format as input",
      "Do NOT add content before or after the selection",
      "Do NOT wrap in markdown code blocks",
    ])
    .addOutputFormat(`
Return ONLY the refined selection in its original markdown format.
Example: If input is "## Title", output must be "## [Refined Title]"
    `.trim())
    .build();
}
```

#### Repurpose Content Prompt

```typescript
buildSystemPrompt(source: GenerationContext, target: GenerationContext, sourceFormat: string, targetFormat: string): string {
  return this.builder
    .reset()
    .addRole("content transformation specialist")
    .addTask(`
Transform content from "${sourceFormat}" format into "${targetFormat}" format.

Your transformation should:
- Preserve the core message, key facts, and valuable insights
- Adapt structure and style for the new format
- Maintain engagement appropriate to the target format
- Follow the target format guidelines precisely
    `.trim())
    .addContext("target_format_guidelines", target.formatGuidelines)
    .addContext("target_brand_voice", target.brandVoiceDescription)
    .addContext("target_persona", target.personaDescription)
    .addExamples(target.examples)
    .addConstraints([
      "Preserve factual accuracy from source",
      "Adapt length and structure for target format",
      "Maintain brand voice consistency",
      "Return only the repurposed content",
    ])
    .addOutputFormat("Return the repurposed content in markdown format, ready for the target platform.")
    .build();
}
```

---

## Part 4: Implementation Plan

### Phase 1: Foundation (Week 1)

1. **Create directory structure**
   - `src/server/ai/core/`
   - `src/server/ai/context/`
   - `src/server/ai/prompts/`
   - `src/server/ai/billing/`
   - `src/server/ai/services/`
   - `src/server/ai/server-functions/`

2. **Extract types and constants**
   - Move all interfaces to `core/types.ts`
   - Move constants to `core/constants.ts`
   - Create custom errors in `core/errors.ts`

3. **Create PromptBuilder utility**
   - Implement XML-structured prompt building
   - Add comprehensive tests

### Phase 2: Core Services (Week 2)

4. **Implement ContextRepository**
   - Extract context fetching logic
   - Add parallel fetching
   - Add caching layer (optional)

5. **Implement BillingService**
   - Extract balance checking
   - Extract usage recording
   - Add token estimation utilities

6. **Implement AIExecutor**
   - Wrap AI SDK calls
   - Handle streaming and non-streaming
   - Add retry logic for transient failures

### Phase 3: Service Layer (Week 3)

7. **Create BaseAIService**
   - Implement template method pattern
   - Define abstract methods
   - Add hooks for customization

8. **Implement concrete services**
   - DraftGenerationService
   - ChatService
   - ContentRefineService
   - SelectionRefineService
   - RepurposeService
   - ImagePromptService

### Phase 4: Prompt Strategies (Week 4)

9. **Create prompt strategies**
   - Implement IPromptStrategy interface
   - Create strategy for each operation
   - Use PromptBuilder for XML structure

10. **Update server functions**
    - Create thin handler wrappers
    - Wire up dependency injection
    - Maintain backwards compatibility

### Phase 5: Migration & Testing (Week 5)

11. **Create legacy exports**
    - `src/server/ai.ts` re-exports for backwards compat
    - Deprecation warnings where appropriate

12. **Comprehensive testing**
    - Unit tests for each service
    - Integration tests for server functions
    - Prompt output validation

---

## Part 5: Benefits of This Architecture

### Maintainability
- Single Responsibility: Each class has one job
- Changes are localized: billing changes only affect BillingService
- Easy to understand: clear separation of concerns

### Testability
- Dependency injection enables mocking
- Small, focused units are easy to test
- Prompt strategies can be tested in isolation

### Extensibility
- Add new AI operations by extending BaseAIService
- Add new prompt formats by creating new strategies
- Swap AI providers without changing services

### Code Reduction
- ~70% reduction in duplicated code
- Shared logic extracted to base classes
- Consistent patterns across all operations

### Prompt Quality
- XML structure is easier for Claude to parse
- Clear separation of context, task, and constraints
- Examples properly formatted for few-shot learning
- Consistent output format specifications

---

## Appendix: File Size Comparison

### Before
| File | Lines |
|------|-------|
| src/server/ai.ts | 1,717 |
| **Total** | **1,717** |

### After (Estimated)
| File | Lines |
|------|-------|
| core/types.ts | 150 |
| core/errors.ts | 50 |
| core/constants.ts | 30 |
| context/ContextRepository.ts | 100 |
| context/ContextAssembler.ts | 50 |
| prompts/PromptBuilder.ts | 120 |
| prompts/strategies/* (6 files) | 300 |
| billing/BillingService.ts | 80 |
| billing/TokenEstimator.ts | 40 |
| services/BaseAIService.ts | 150 |
| services/* (6 concrete) | 360 |
| server-functions/handlers.ts | 100 |
| **Total** | **~1,530** |

**Net reduction: ~10% fewer lines**, but more importantly:
- No file exceeds 150 lines
- Each file has a single responsibility
- Duplication eliminated
- Much easier to maintain and test
