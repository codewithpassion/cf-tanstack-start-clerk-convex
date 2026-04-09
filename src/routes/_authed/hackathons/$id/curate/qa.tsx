import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../convex/_generated/dataModel'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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

export const Route = createFileRoute(
  '/_authed/hackathons/$id/curate/qa',
)({
  component: CurateQAPage,
})

function CurateQAPage() {
  const { id } = Route.useParams()
  const hackathonId = id as Id<'hackathons'>
  const questions = useQuery(api.problemQA.listAllForHackathon, {
    hackathonId,
  })

  const answerQuestion = useMutation(api.problemQA.answerQuestion)
  const publishQuestion = useMutation(api.problemQA.publishQuestion)
  const unpublishQuestion = useMutation(api.problemQA.unpublishQuestion)
  const deleteQuestion = useMutation(api.problemQA.deleteQuestion)

  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')

  if (questions === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  const unanswered = questions.filter((q) => !q.answer)
  const answered = questions.filter((q) => q.answer && !q.isPublished)
  const published = questions.filter((q) => q.isPublished)

  async function handleAnswer(questionId: string) {
    if (!answerText.trim()) return
    try {
      await answerQuestion({
        questionId: questionId as Id<'problemQuestions'>,
        answer: answerText.trim(),
      })
      setAnsweringId(null)
      setAnswerText('')
      toast.success('Answer submitted')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit answer',
      )
    }
  }

  async function handlePublish(questionId: string) {
    try {
      await publishQuestion({
        questionId: questionId as Id<'problemQuestions'>,
      })
      toast.success('Question published')
    } catch (error) {
      toast.error('Failed to publish')
    }
  }

  async function handleUnpublish(questionId: string) {
    try {
      await unpublishQuestion({
        questionId: questionId as Id<'problemQuestions'>,
      })
      toast.success('Question unpublished')
    } catch (error) {
      toast.error('Failed to unpublish')
    }
  }

  async function handleDelete(questionId: string) {
    try {
      await deleteQuestion({
        questionId: questionId as Id<'problemQuestions'>,
      })
      toast.success('Question deleted')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete',
      )
    }
  }

  function QuestionCard({
    q,
    showAnswer,
    showPublish,
  }: {
    q: NonNullable<typeof questions>[number]
    showAnswer?: boolean
    showPublish?: boolean
  }) {
    return (
      <Card>
        <CardHeader>
          <CardDescription className="text-xs">
            Problem: {q.problemTitle}
          </CardDescription>
          <CardTitle className="text-base">Q: {q.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {q.answer ? (
            <p className="text-sm">
              <span className="font-medium">A:</span> {q.answer}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No answer yet
            </p>
          )}

          {showAnswer && !q.answer && (
            <>
              {answeringId === q._id ? (
                <div className="space-y-2">
                  <Textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Type your answer..."
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAnswer(q._id)}>
                      Submit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAnsweringId(null)
                        setAnswerText('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAnsweringId(q._id)
                    setAnswerText('')
                  }}
                >
                  Answer
                </Button>
              )}
            </>
          )}

          <div className="flex gap-2">
            {showPublish && q.answer && !q.isPublished && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePublish(q._id)}
              >
                Publish
              </Button>
            )}
            {q.isPublished && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUnpublish(q._id)}
              >
                Unpublish
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDelete(q._id)}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Q&A Moderation</h1>

      <Tabs defaultValue="unanswered">
        <TabsList>
          <TabsTrigger value="unanswered">
            Unanswered ({unanswered.length})
          </TabsTrigger>
          <TabsTrigger value="answered">
            Answered ({answered.length})
          </TabsTrigger>
          <TabsTrigger value="published">
            Published ({published.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unanswered" className="space-y-4 mt-4">
          {unanswered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No unanswered questions.
            </p>
          ) : (
            unanswered.map((q) => (
              <QuestionCard key={q._id} q={q} showAnswer showPublish />
            ))
          )}
        </TabsContent>

        <TabsContent value="answered" className="space-y-4 mt-4">
          {answered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No answered (unpublished) questions.
            </p>
          ) : (
            answered.map((q) => (
              <QuestionCard key={q._id} q={q} showPublish />
            ))
          )}
        </TabsContent>

        <TabsContent value="published" className="space-y-4 mt-4">
          {published.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No published questions.
            </p>
          ) : (
            published.map((q) => <QuestionCard key={q._id} q={q} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
