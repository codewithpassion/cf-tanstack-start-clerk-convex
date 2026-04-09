import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../convex/_generated/dataModel'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

const statusVariant: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  hidden: 'bg-gray-100 text-gray-800',
}

export const Route = createFileRoute(
  '/_authed/hackathons/$id/curate/problems',
)({
  component: CurateProblemsPage,
})

function CurateProblemsPage() {
  const { id } = Route.useParams()
  const hackathonId = id as Id<'hackathons'>
  const problems = useQuery(api.problems.listByHackathon, { hackathonId })

  const approveProblem = useMutation(api.problems.approve)
  const rejectProblem = useMutation(api.problems.reject)
  const hideProblem = useMutation(api.problems.hide)
  const unhideProblem = useMutation(api.problems.unhide)

  const [selected, setSelected] = useState<Set<string>>(new Set())

  if (problems === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  const byStatus = (status: string) =>
    problems.filter((p) => p.status === status)

  function toggleSelect(problemId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(problemId)) next.delete(problemId)
      else next.add(problemId)
      return next
    })
  }

  function selectAll(status: string) {
    const ids = byStatus(status).map((p) => p._id)
    setSelected(new Set(ids))
  }

  async function bulkApprove() {
    try {
      await Promise.all(
        Array.from(selected).map((problemId) =>
          approveProblem({ id: problemId as Id<'problems'> }),
        ),
      )
      setSelected(new Set())
      toast.success(`Approved ${selected.size} problem(s)`)
    } catch (error) {
      toast.error('Failed to bulk approve')
    }
  }

  async function bulkReject() {
    try {
      await Promise.all(
        Array.from(selected).map((problemId) =>
          rejectProblem({ id: problemId as Id<'problems'> }),
        ),
      )
      setSelected(new Set())
      toast.success(`Rejected ${selected.size} problem(s)`)
    } catch (error) {
      toast.error('Failed to bulk reject')
    }
  }

  async function handleAction(
    action: 'approve' | 'reject' | 'hide' | 'unhide',
    problemId: string,
  ) {
    try {
      const pid = problemId as Id<'problems'>
      switch (action) {
        case 'approve':
          await approveProblem({ id: pid })
          break
        case 'reject':
          await rejectProblem({ id: pid })
          break
        case 'hide':
          await hideProblem({ id: pid })
          break
        case 'unhide':
          await unhideProblem({ id: pid })
          break
      }
      toast.success(`Problem ${action}d`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to ${action}`,
      )
    }
  }

  function ProblemCard({
    problem,
    actions,
  }: {
    problem: NonNullable<typeof problems>[number]
    actions: { label: string; action: 'approve' | 'reject' | 'hide' | 'unhide'; variant?: 'default' | 'destructive' | 'outline' }[]
  }) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Checkbox
              checked={selected.has(problem._id)}
              onCheckedChange={() => toggleSelect(problem._id)}
            />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{problem.title}</CardTitle>
                <Badge className={statusVariant[problem.status]}>
                  {problem.status}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                Created {new Date(problem.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {problem.description}
          </p>
          <div className="flex gap-2">
            {actions.map((a) => (
              <Button
                key={a.action}
                size="sm"
                variant={a.variant ?? 'default'}
                onClick={() => handleAction(a.action, problem._id)}
              >
                {a.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Curate Problems</h1>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
          <span className="text-sm font-medium">
            {selected.size} selected
          </span>
          <Button size="sm" onClick={bulkApprove}>
            Bulk Approve
          </Button>
          <Button size="sm" variant="destructive" onClick={bulkReject}>
            Bulk Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({byStatus('pending').length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({byStatus('approved').length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({byStatus('rejected').length})
          </TabsTrigger>
          <TabsTrigger value="hidden">
            Hidden ({byStatus('hidden').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {byStatus('pending').length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => selectAll('pending')}
            >
              Select All
            </Button>
          )}
          {byStatus('pending').length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No pending problems.
            </p>
          ) : (
            byStatus('pending').map((p) => (
              <ProblemCard
                key={p._id}
                problem={p}
                actions={[
                  { label: 'Approve', action: 'approve' },
                  {
                    label: 'Reject',
                    action: 'reject',
                    variant: 'destructive',
                  },
                ]}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-4">
          {byStatus('approved').length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No approved problems.
            </p>
          ) : (
            byStatus('approved').map((p) => (
              <ProblemCard
                key={p._id}
                problem={p}
                actions={[
                  { label: 'Hide', action: 'hide', variant: 'outline' },
                  {
                    label: 'Reject',
                    action: 'reject',
                    variant: 'destructive',
                  },
                ]}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-4">
          {byStatus('rejected').length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No rejected problems.
            </p>
          ) : (
            byStatus('rejected').map((p) => (
              <ProblemCard
                key={p._id}
                problem={p}
                actions={[
                  { label: 'Approve', action: 'approve' },
                ]}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="hidden" className="space-y-4 mt-4">
          {byStatus('hidden').length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No hidden problems.
            </p>
          ) : (
            byStatus('hidden').map((p) => (
              <ProblemCard
                key={p._id}
                problem={p}
                actions={[
                  { label: 'Unhide', action: 'unhide' },
                ]}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
