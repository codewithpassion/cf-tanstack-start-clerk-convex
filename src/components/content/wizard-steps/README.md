# Wizard Steps Components

This directory contains individual step components for multi-step wizards in the content creation flow.

## DetailsStep

The `DetailsStep` component collects content details including title, topic, draft content, and source material uploads.

### Usage Example

```tsx
import { DetailsStep } from './wizard-steps/DetailsStep';
import { useState } from 'react';
import type { Id } from '@/convex/dataModel';

function MyWizard() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [uploadedFileIds, setUploadedFileIds] = useState<Id<"files">[]>([]);

  if (step === 3) {
    return (
      <DetailsStep
        title={title}
        topic={topic}
        draftContent={draftContent}
        uploadedFileIds={uploadedFileIds}
        onBack={() => setStep(2)}
        onNext={(data) => {
          setTitle(data.title);
          setTopic(data.topic);
          setDraftContent(data.draftContent);
          setUploadedFileIds(data.uploadedFileIds);
          setStep(4);
        }}
      />
    );
  }

  // ... other steps
}
```

### Props

- `title: string` - Initial title value
- `topic: string` - Initial topic value
- `draftContent: string` - Initial draft content value
- `uploadedFileIds: Id<"files">[]` - Array of uploaded file IDs
- `onBack: () => void` - Callback when Back button is clicked
- `onNext: (data) => void` - Callback when Next button is clicked with validated data

### Features

- Title input with character counter (max 200 characters, required)
- Topic textarea (optional)
- Draft content textarea (optional)
- Multi-file upload with preview and removal
- Form validation with inline error messages
- Full dark theme support
- Accessible with ARIA labels and descriptions

### Dark Theme

All form elements include dark theme variants that automatically apply based on the `dark` class on the document root. The component uses Tailwind's dark mode classes to ensure proper contrast and readability in both light and dark themes.
