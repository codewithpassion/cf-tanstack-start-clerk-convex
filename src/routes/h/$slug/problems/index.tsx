import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/h/$slug/problems/')({
  component: PublicProblemsPage,
})

function PublicProblemsPage() {
  const { slug } = Route.useParams()
  const hackathon = useQuery(api.problems.getHackathonBySlug, { slug })
  const problems = useQuery(
    api.problems.listApprovedByHackathon,
    hackathon ? { hackathonId: hackathon._id } : 'skip',
  )

  if (hackathon === undefined || problems === undefined) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (hackathon === null) {
    return (
      <div className="container mx-auto p-6 text-center text-muted-foreground">
        Hackathon not found.
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{hackathon.name} - Problems</h1>
        <p className="text-muted-foreground mt-1">
          Browse approved problems for this hackathon.
        </p>
      </div>

      {problems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No approved problems yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {problems.map((problem) => (
            <Link
              key={problem._id}
              to="/h/$slug/problems/$problemId"
              params={{ slug, problemId: problem._id }}
            >
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{problem.title}</CardTitle>
                    <Badge className="bg-green-100 text-green-800">
                      approved
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {problem.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
