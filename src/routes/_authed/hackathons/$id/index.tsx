import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { toast } from 'sonner'
import {
  Settings,
  FileText,
  LayoutGrid,
  Users,
  Trophy,
  Send,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_authed/hackathons/$id/')({
  component: HackathonDashboardPage,
})

const statusBadgeVariant: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }> = {
  draft: { variant: 'secondary' },
  open: { variant: 'default' },
  active: { variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  judging: { variant: 'outline' },
  closed: { variant: 'secondary' },
  archived: { variant: 'destructive' },
}

const statusTransitions: Record<string, { label: string; next: string }[]> = {
  draft: [{ label: 'Open Registration', next: 'open' }],
  open: [{ label: 'Start Hackathon', next: 'active' }],
  active: [{ label: 'Begin Judging', next: 'judging' }],
  judging: [{ label: 'Close Hackathon', next: 'closed' }],
  closed: [{ label: 'Archive', next: 'archived' }],
  archived: [],
}

function HackathonDashboardPage() {
  const { id } = Route.useParams()
  const hackathon = useQuery(api.hackathons.getById, { id: id as Id<"hackathons"> })
  const updateStatus = useMutation(api.hackathons.updateStatus)

  if (hackathon === undefined) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    )
  }

  if (hackathon === null) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Hackathon Not Found</h1>
        <p className="text-muted-foreground">This hackathon does not exist or you do not have access.</p>
      </div>
    )
  }

  const badge = statusBadgeVariant[hackathon.status] ?? { variant: 'secondary' as const }
  const transitions = statusTransitions[hackathon.status] ?? []

  async function handleStatusChange(newStatus: string) {
    try {
      await updateStatus({
        id: id as Id<"hackathons">,
        status: newStatus as "draft" | "open" | "active" | "judging" | "closed" | "archived",
      })
      toast.success(`Status changed to ${newStatus}`)
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{hackathon.name}</h1>
            <Badge variant={badge.variant} className={badge.className}>
              {hackathon.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{hackathon.description}</p>
          {hackathon.theme && (
            <p className="text-sm text-muted-foreground mt-1">Theme: {hackathon.theme}</p>
          )}
        </div>
      </div>

      {/* Status transitions */}
      {transitions.length > 0 && (
        <div className="flex gap-2 mb-6">
          {transitions.map((t) => (
            <Button key={t.next} onClick={() => handleStatusChange(t.next)}>
              {t.label}
            </Button>
          ))}
        </div>
      )}

      <Separator className="mb-6" />

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Start Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {hackathon.startDate
                ? new Date(hackathon.startDate).toLocaleDateString()
                : 'Not set'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              End Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {hackathon.endDate
                ? new Date(hackathon.endDate).toLocaleDateString()
                : 'Not set'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Submission Cutoff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {hackathon.submissionCutoff
                ? new Date(hackathon.submissionCutoff).toLocaleDateString()
                : 'Not set'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <h2 className="text-xl font-semibold mb-4">Manage</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/hackathons/$id/settings" params={{ id }}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Settings
              </CardTitle>
              <CardDescription>Edit basic info, dates, and moderation</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/hackathons/$id/content" params={{ id }}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Content Pages
              </CardTitle>
              <CardDescription>Sponsors, prizes, rules, eligibility</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/hackathons/$id/categories" params={{ id }}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutGrid className="h-4 w-4" />
                Categories
              </CardTitle>
              <CardDescription>Manage submission categories</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Teams
            </CardTitle>
            <CardDescription>View and manage teams</CardDescription>
          </CardHeader>
        </Card>
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4" />
              Submissions
            </CardTitle>
            <CardDescription>Review submissions</CardDescription>
          </CardHeader>
        </Card>
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4" />
              Results
            </CardTitle>
            <CardDescription>Judging and results</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
