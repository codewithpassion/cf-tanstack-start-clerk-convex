import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/h/$slug/about')({
  component: PublicHackathonAboutPage,
})

const contentSections = [
  { key: 'sponsorsContent' as const, label: 'Sponsors' },
  { key: 'prizesContent' as const, label: 'Prizes' },
  { key: 'rulesContent' as const, label: 'Rules' },
  { key: 'eligibilityContent' as const, label: 'Eligibility' },
]

function PublicHackathonAboutPage() {
  const { slug } = Route.useParams()
  const hackathon = useQuery(api.hackathons.getBySlug, { slug })

  if (hackathon === undefined) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (hackathon === null) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <h1 className="text-3xl font-bold mb-4">Hackathon Not Found</h1>
        <Button asChild variant="outline">
          <Link to="/h">Browse Hackathons</Link>
        </Button>
      </div>
    )
  }

  const hasContent = contentSections.some((s) => hackathon[s.key])

  // Find first tab that has content
  const defaultTab = contentSections.find((s) => hackathon[s.key])?.key ?? contentSections[0].key

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Button asChild variant="ghost" className="mb-4 -ml-4">
          <Link to="/h/$slug" params={{ slug }}>
            &larr; Back to {hackathon.name}
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">About</h1>
      </div>

      {!hasContent ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              No additional information has been published yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            {contentSections
              .filter((s) => hackathon[s.key])
              .map((s) => (
                <TabsTrigger key={s.key} value={s.key}>
                  {s.label}
                </TabsTrigger>
              ))}
          </TabsList>

          {contentSections
            .filter((s) => hackathon[s.key])
            .map((s) => (
              <TabsContent key={s.key} value={s.key}>
                <Card>
                  <CardHeader>
                    <CardTitle>{s.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                      {hackathon[s.key]}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
        </Tabs>
      )}
    </div>
  )
}
