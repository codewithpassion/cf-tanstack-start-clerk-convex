import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@clerk/tanstack-react-start'
import { api } from '../../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../../convex/_generated/dataModel'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  backgroundContext: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export const Route = createFileRoute(
  '/_authed/hackathons/$id/problems/$problemId/edit',
)({
  component: EditProblemPage,
})

function EditProblemPage() {
  const { id, problemId } = Route.useParams()
  const { userId } = useAuth()
  const navigate = useNavigate()
  const problem = useQuery(api.problems.getById, {
    id: problemId as Id<'problems'>,
  })
  const updateProblem = useMutation(api.problems.update)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: problem
      ? {
          title: problem.title,
          description: problem.description,
          backgroundContext: problem.backgroundContext ?? '',
        }
      : undefined,
  })

  if (problem === undefined) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (problem === null) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Problem not found.
      </div>
    )
  }

  if (problem.proposerId !== userId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Only the proposer can edit this problem.
      </div>
    )
  }

  if (problem.status === 'rejected' || problem.status === 'hidden') {
    return (
      <div className="text-center py-12 text-muted-foreground">
        This problem cannot be edited in its current state.
      </div>
    )
  }

  async function onSubmit(values: FormValues) {
    try {
      await updateProblem({
        id: problemId as Id<'problems'>,
        title: values.title,
        description: values.description,
        backgroundContext: values.backgroundContext || undefined,
      })
      toast.success('Problem updated')
      navigate({
        to: '/hackathons/$id/problems/$problemId',
        params: { id, problemId },
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update problem',
      )
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Edit Problem</CardTitle>
          <CardDescription>Update your problem submission.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Problem title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the problem in detail..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a clear and detailed description.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="backgroundContext"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Background Context (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide additional context, research, or references..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate({
                      to: '/hackathons/$id/problems/$problemId',
                      params: { id, problemId },
                    })
                  }
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
