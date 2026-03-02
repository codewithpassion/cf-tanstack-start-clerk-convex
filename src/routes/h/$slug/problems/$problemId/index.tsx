import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../convex/_generated/dataModel'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute(
  '/h/$slug/problems/$problemId/',
)({
  component: PublicProblemDetailPage,
})

function PublicProblemDetailPage() {
  const { slug, problemId } = Route.useParams()
  const problem = useQuery(api.problems.getById, {
    id: problemId as Id<'problems'>,
  })
  const questions = useQuery(api.problemQA.listQuestionsForProblem, {
    problemId: problemId as Id<'problems'>,
  })

  if (problem === undefined) {
    return (
      <div className="container mx-auto p-6 space-y-4 max-w-3xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (problem === null) {
    return (
      <div className="container mx-auto p-6 text-center text-muted-foreground">
        Problem not found.
      </div>
    )
  }

  const publishedQuestions = questions?.filter((q) => q.isPublished) ?? []

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      <div>
        <Link
          to="/h/$slug/problems"
          params={{ slug }}
          className="text-sm text-muted-foreground hover:underline"
        >
          Back to problems
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">{problem.title}</h1>
        <Badge className="bg-green-100 text-green-800">approved</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Proposed by {problem.proposerName}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{problem.description}</p>
        </CardContent>
      </Card>

      {problem.backgroundContext && (
        <Card>
          <CardHeader>
            <CardTitle>Background Context</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{problem.backgroundContext}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">FAQ</h2>

        {publishedQuestions.length > 0 ? (
          <div className="space-y-4">
            {publishedQuestions.map((q) => (
              <Card key={q._id}>
                <CardHeader>
                  <CardDescription className="font-medium text-foreground">
                    Q: {q.question}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {q.answer ? (
                    <p className="text-sm">
                      <span className="font-medium">A:</span> {q.answer}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Awaiting answer
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No published Q&A yet.
          </p>
        )}

        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-muted-foreground text-sm mb-3">
              Have a question about this problem?
            </p>
            <Link to="/sign-in" search={{ redirect: '/' }}>
              <Button variant="outline">Login to ask a question</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
