import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_authed/hackathons/$id/settings')({
  component: HackathonSettingsPage,
})

const generalSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  theme: z.string().optional(),
  visibility: z.enum(['public', 'private']),
})

const timelineSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  submissionCutoff: z.string().optional(),
})

const moderationSchema = z.object({
  problemModerationMode: z.enum(['auto', 'manual']),
  solutionModerationMode: z.enum(['auto', 'manual']),
  galleryPublic: z.boolean(),
})

function toDateTimeLocal(timestamp?: number): string {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  // Format as YYYY-MM-DDTHH:mm
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function HackathonSettingsPage() {
  const { id } = Route.useParams()
  const hackathon = useQuery(api.hackathons.getById, { id: id as Id<"hackathons"> })
  const updateHackathon = useMutation(api.hackathons.update)
  const updateDates = useMutation(api.hackathons.updateDates)

  const generalForm = useForm<z.infer<typeof generalSchema>>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: '',
      description: '',
      theme: '',
      visibility: 'public',
    },
  })

  const timelineForm = useForm<z.infer<typeof timelineSchema>>({
    resolver: zodResolver(timelineSchema),
    defaultValues: {
      startDate: '',
      endDate: '',
      submissionCutoff: '',
    },
  })

  const moderationForm = useForm<z.infer<typeof moderationSchema>>({
    resolver: zodResolver(moderationSchema),
    defaultValues: {
      problemModerationMode: 'manual',
      solutionModerationMode: 'manual',
      galleryPublic: false,
    },
  })

  // Populate forms when data loads
  useEffect(() => {
    if (hackathon) {
      generalForm.reset({
        name: hackathon.name,
        description: hackathon.description,
        theme: hackathon.theme ?? '',
        visibility: hackathon.visibility,
      })
      timelineForm.reset({
        startDate: toDateTimeLocal(hackathon.startDate),
        endDate: toDateTimeLocal(hackathon.endDate),
        submissionCutoff: toDateTimeLocal(hackathon.submissionCutoff),
      })
      moderationForm.reset({
        problemModerationMode: hackathon.problemModerationMode,
        solutionModerationMode: hackathon.solutionModerationMode,
        galleryPublic: hackathon.galleryPublic,
      })
    }
  }, [hackathon])

  if (hackathon === undefined) {
    return (
      <div className="max-w-3xl mx-auto">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (hackathon === null) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Hackathon Not Found</h1>
      </div>
    )
  }

  async function onSaveGeneral(values: z.infer<typeof generalSchema>) {
    try {
      await updateHackathon({
        id: id as Id<"hackathons">,
        name: values.name,
        description: values.description,
        theme: values.theme || undefined,
        visibility: values.visibility,
      })
      toast.success('General settings saved')
    } catch (error) {
      toast.error('Failed to save settings')
    }
  }

  async function onSaveTimeline(values: z.infer<typeof timelineSchema>) {
    try {
      await updateDates({
        id: id as Id<"hackathons">,
        startDate: values.startDate ? new Date(values.startDate).getTime() : undefined,
        endDate: values.endDate ? new Date(values.endDate).getTime() : undefined,
        submissionCutoff: values.submissionCutoff
          ? new Date(values.submissionCutoff).getTime()
          : undefined,
      })
      toast.success('Timeline saved')
    } catch (error) {
      toast.error('Failed to save timeline')
    }
  }

  async function onSaveModeration(values: z.infer<typeof moderationSchema>) {
    try {
      await updateHackathon({
        id: id as Id<"hackathons">,
        problemModerationMode: values.problemModerationMode,
        solutionModerationMode: values.solutionModerationMode,
        galleryPublic: values.galleryPublic,
      })
      toast.success('Moderation settings saved')
    } catch (error) {
      toast.error('Failed to save settings')
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...generalForm}>
                <form onSubmit={generalForm.handleSubmit(onSaveGeneral)} className="space-y-6">
                  <FormField
                    control={generalForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={generalForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={generalForm.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Theme (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={generalForm.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visibility</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={generalForm.formState.isSubmitting}>
                    {generalForm.formState.isSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...timelineForm}>
                <form onSubmit={timelineForm.handleSubmit(onSaveTimeline)} className="space-y-6">
                  <FormField
                    control={timelineForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={timelineForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={timelineForm.control}
                    name="submissionCutoff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Submission Cutoff</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormDescription>
                          Deadline for teams to submit their solutions.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={timelineForm.formState.isSubmitting}>
                    {timelineForm.formState.isSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation">
          <Card>
            <CardHeader>
              <CardTitle>Moderation Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...moderationForm}>
                <form onSubmit={moderationForm.handleSubmit(onSaveModeration)} className="space-y-6">
                  <FormField
                    control={moderationForm.control}
                    name="problemModerationMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Problem Moderation</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="auto">Auto-approve</SelectItem>
                            <SelectItem value="manual">Manual review</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={moderationForm.control}
                    name="solutionModerationMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Solution Moderation</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="auto">Auto-approve</SelectItem>
                            <SelectItem value="manual">Manual review</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={moderationForm.control}
                    name="galleryPublic"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel>Public Gallery</FormLabel>
                          <FormDescription>
                            Allow anyone to view submissions in the public gallery.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={moderationForm.formState.isSubmitting}>
                    {moderationForm.formState.isSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
