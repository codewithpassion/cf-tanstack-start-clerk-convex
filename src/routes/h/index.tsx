import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useState } from 'react'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/h/')({
  component: PublicHackathonsPage,
})

const statusBadgeVariant: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }> = {
  draft: { variant: 'secondary' },
  open: { variant: 'default' },
  active: { variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  judging: { variant: 'outline' },
  closed: { variant: 'secondary' },
  archived: { variant: 'destructive' },
}

function PublicHackathonsPage() {
  const [search, setSearch] = useState('')
  const hackathons = useQuery(api.hackathons.listPublic, {
    search: search || undefined,
  })

  return (
    <div className="container mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold mb-6">Discover Hackathons</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search hackathons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {hackathons === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : hackathons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              {search ? 'No hackathons match your search.' : 'No public hackathons available yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hackathons.map((hackathon) => {
            const badge = statusBadgeVariant[hackathon.status] ?? { variant: 'secondary' as const }
            return (
              <Link key={hackathon._id} to="/h/$slug" params={{ slug: hackathon.slug }}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg truncate">{hackathon.name}</CardTitle>
                      <Badge variant={badge.variant} className={badge.className}>
                        {hackathon.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-3">
                      {hackathon.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {hackathon.theme && (
                        <p>Theme: {hackathon.theme}</p>
                      )}
                      {hackathon.startDate && (
                        <p>Starts: {new Date(hackathon.startDate).toLocaleDateString()}</p>
                      )}
                      {hackathon.endDate && (
                        <p>Ends: {new Date(hackathon.endDate).toLocaleDateString()}</p>
                      )}
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
