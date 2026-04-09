import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_authed/hackathons/')({
  component: HackathonsListPage,
})

const statusBadgeVariant: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }> = {
  draft: { variant: 'secondary' },
  open: { variant: 'default' },
  active: { variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  judging: { variant: 'outline' },
  closed: { variant: 'secondary' },
  archived: { variant: 'destructive' },
}

function HackathonsListPage() {
  const hackathons = useQuery(api.hackathons.listMyHackathons)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Hackathons</h1>
        <Button asChild>
          <Link to="/hackathons/new">
            <Plus className="mr-2 h-4 w-4" />
            New Hackathon
          </Link>
        </Button>
      </div>

      {hackathons === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : hackathons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">You have not created any hackathons yet.</p>
            <Button asChild>
              <Link to="/hackathons/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Hackathon
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hackathons.map((hackathon) => {
            const badge = statusBadgeVariant[hackathon.status] ?? { variant: 'secondary' as const }
            return (
              <Link key={hackathon._id} to="/hackathons/$id" params={{ id: hackathon._id }}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg truncate">{hackathon.name}</CardTitle>
                      <Badge variant={badge.variant} className={badge.className}>
                        {hackathon.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {hackathon.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {hackathon.startDate && (
                        <p>Starts: {new Date(hackathon.startDate).toLocaleDateString()}</p>
                      )}
                      {hackathon.endDate && (
                        <p>Ends: {new Date(hackathon.endDate).toLocaleDateString()}</p>
                      )}
                      <p className="text-xs">
                        Created {new Date(hackathon.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
