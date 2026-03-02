import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../convex/_generated/dataModel'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

const statusVariant: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  hidden: 'bg-gray-100 text-gray-800',
}

export const Route = createFileRoute(
  '/_authed/hackathons/$id/problems/',
)({
  component: ProblemsListPage,
})

function ProblemsListPage() {
  const { id } = Route.useParams()
  const hackathonId = id as Id<'hackathons'>
  const problems = useQuery(api.problems.listByHackathon, { hackathonId })
  const myProblems = useQuery(api.problems.listByProposer, { hackathonId })

  if (problems === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Problems</h1>
        <Link to="/hackathons/$id/problems/new" params={{ id }}>
          <Button>Submit a Problem</Button>
        </Link>
      </div>

      {problems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No problems have been approved yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {problems.map((problem) => (
            <Link
              key={problem._id}
              to="/hackathons/$id/problems/$problemId"
              params={{ id, problemId: problem._id }}
            >
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{problem.title}</CardTitle>
                    <Badge className={statusVariant[problem.status]}>
                      {problem.status}
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

      {myProblems && myProblems.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="text-xl font-semibold mb-4">My Submissions</h2>
            <div className="grid gap-4">
              {myProblems.map((problem) => (
                <Link
                  key={problem._id}
                  to="/hackathons/$id/problems/$problemId"
                  params={{ id, problemId: problem._id }}
                >
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">
                          {problem.title}
                        </CardTitle>
                        <Badge className={statusVariant[problem.status]}>
                          {problem.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        Submitted{' '}
                        {new Date(problem.createdAt).toLocaleDateString()}
                      </CardDescription>
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
          </div>
        </>
      )}
    </div>
  )
}
