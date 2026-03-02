import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { api } from '../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../convex/_generated/dataModel'

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

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  backgroundContext: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export const Route = createFileRoute(
  '/_authed/hackathons/$id/problems/new',
)({
  component: NewProblemPage,
})

function NewProblemPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const createProblem = useMutation(api.problems.create)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', description: '', backgroundContext: '' },
  })

  async function onSubmit(values: FormValues) {
    try {
      await createProblem({
        hackathonId: id as Id<'hackathons'>,
        title: values.title,
        description: values.description,
        backgroundContext: values.backgroundContext || undefined,
      })
      toast.success('Problem submitted successfully')
      navigate({ to: '/hackathons/$id/problems', params: { id } })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit problem',
      )
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Submit a Problem</CardTitle>
          <CardDescription>
            Propose a problem for participants to solve during the hackathon.
          </CardDescription>
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
                      Provide a clear and detailed description (100+ characters
                      recommended).
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
                    <FormDescription>
                      Provide additional context, research, or references that
                      may help participants understand the problem.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Submitting...' : 'Submit Problem'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate({ to: '/hackathons/$id/problems', params: { id } })
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
