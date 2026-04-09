import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_authed/hackathons/$id/content')({
  component: HackathonContentPage,
})

type ContentField = 'sponsorsContent' | 'prizesContent' | 'rulesContent' | 'eligibilityContent'

const contentTabs: { key: ContentField; label: string }[] = [
  { key: 'sponsorsContent', label: 'Sponsors' },
  { key: 'prizesContent', label: 'Prizes' },
  { key: 'rulesContent', label: 'Rules' },
  { key: 'eligibilityContent', label: 'Eligibility' },
]

function ContentEditor({
  hackathonId,
  field,
  initialValue,
}: {
  hackathonId: Id<"hackathons">
  field: ContentField
  initialValue: string
}) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const updateContent = useMutation(api.hackathons.updateContent)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  async function handleSave() {
    setSaving(true)
    try {
      await updateContent({
        id: hackathonId,
        [field]: value,
      })
      toast.success('Content saved')
    } catch (error) {
      toast.error('Failed to save content')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={12}
        placeholder="Write your content here (Markdown supported)..."
        className="font-mono text-sm"
      />
      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
      {value && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Preview</h3>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-md border p-4">
              {value}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function HackathonContentPage() {
  const { id } = Route.useParams()
  const hackathon = useQuery(api.hackathons.getById, { id: id as Id<"hackathons"> })

  if (hackathon === undefined) {
    return (
      <div className="max-w-3xl mx-auto">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (hackathon === null) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Hackathon Not Found</h1>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Content Pages</h1>

      <Tabs defaultValue="sponsorsContent">
        <TabsList>
          {contentTabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {contentTabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            <Card>
              <CardHeader>
                <CardTitle>{tab.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <ContentEditor
                  hackathonId={hackathon._id}
                  field={tab.key}
                  initialValue={hackathon[tab.key] ?? ''}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
