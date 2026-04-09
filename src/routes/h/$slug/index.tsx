import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Calendar, Clock, Tag } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/h/$slug/')({
  component: PublicHackathonDetailPage,
})

const statusBadgeVariant: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }> = {
  draft: { variant: 'secondary' },
  open: { variant: 'default' },
  active: { variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  judging: { variant: 'outline' },
  closed: { variant: 'secondary' },
  archived: { variant: 'destructive' },
}

function PublicHackathonDetailPage() {
  const { slug } = Route.useParams()
  const hackathon = useQuery(api.hackathons.getBySlug, { slug })

  if (hackathon === undefined) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-6 w-96 mb-6" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (hackathon === null) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <h1 className="text-3xl font-bold mb-4">Hackathon Not Found</h1>
        <p className="text-muted-foreground mb-4">
          This hackathon does not exist or is not publicly accessible.
        </p>
        <Button asChild variant="outline">
          <Link to="/h">Browse Hackathons</Link>
        </Button>
      </div>
    )
  }

  const badge = statusBadgeVariant[hackathon.status] ?? { variant: 'secondary' as const }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{hackathon.name}</h1>
          <Badge variant={badge.variant} className={badge.className}>
            {hackathon.status}
          </Badge>
        </div>
        <p className="text-lg text-muted-foreground">{hackathon.description}</p>
      </div>

      <div className="flex gap-2 mb-6">
        <Button asChild variant="outline">
          <Link to="/h/$slug/about" params={{ slug }}>
            About
          </Link>
        </Button>
      </div>

      <Separator className="mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {hackathon.theme && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Theme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{hackathon.theme}</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Start Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {hackathon.startDate
                ? new Date(hackathon.startDate).toLocaleDateString()
                : 'TBD'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              End Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {hackathon.endDate
                ? new Date(hackathon.endDate).toLocaleDateString()
                : 'TBD'}
            </p>
          </CardContent>
        </Card>
        {hackathon.submissionCutoff && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Submission Cutoff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">
                {new Date(hackathon.submissionCutoff).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
