import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useAuth } from '@clerk/tanstack-react-start'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../../convex/_generated/dataModel'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  '/_authed/hackathons/$id/problems/$problemId/',
)({
  component: ProblemDetailPage,
})

function ProblemDetailPage() {
  const { id, problemId } = Route.useParams()
  const { userId } = useAuth()
  const problem = useQuery(api.problems.getById, {
    id: problemId as Id<'problems'>,
  })
  const questions = useQuery(api.problemQA.listQuestionsForProblem, {
    problemId: problemId as Id<'problems'>,
  })

  const askQuestion = useMutation(api.problemQA.askQuestion)
  const answerQuestion = useMutation(api.problemQA.answerQuestion)
  const publishQuestion = useMutation(api.problemQA.publishQuestion)
  const unpublishQuestion = useMutation(api.problemQA.unpublishQuestion)

  const [newQuestion, setNewQuestion] = useState('')
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')

  if (problem === undefined) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
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

  const isProposer = userId === problem.proposerId
  const canEdit =
    isProposer &&
    (problem.status === 'pending' || problem.status === 'approved')

  async function handleAskQuestion() {
    if (!newQuestion.trim()) return
    try {
      await askQuestion({
        problemId: problemId as Id<'problems'>,
        hackathonId: id as Id<'hackathons'>,
        question: newQuestion.trim(),
      })
      setNewQuestion('')
      toast.success('Question submitted')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit question',
      )
    }
  }

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

  async function handleTogglePublish(
    questionId: string,
    isPublished: boolean,
  ) {
    try {
      if (isPublished) {
        await unpublishQuestion({
          questionId: questionId as Id<'problemQuestions'>,
        })
      } else {
        await publishQuestion({
          questionId: questionId as Id<'problemQuestions'>,
        })
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update question',
      )
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Proposed by {problem.proposerName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusVariant[problem.status]}>
            {problem.status}
          </Badge>
          {canEdit && (
            <Link
              to="/hackathons/$id/problems/$problemId/edit"
              params={{ id, problemId }}
            >
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

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
        <h2 className="text-xl font-semibold">Questions & Answers</h2>

        {questions && questions.length > 0 ? (
          <div className="space-y-4">
            {questions.map((q) => (
              <Card key={q._id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardDescription className="font-medium text-foreground">
                      Q: {q.question}
                    </CardDescription>
                    {!q.isPublished && (
                      <Badge variant="outline" className="text-xs">
                        Unpublished
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {q.answer ? (
                    <p className="text-sm">
                      <span className="font-medium">A:</span> {q.answer}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Awaiting answer
                    </p>
                  )}

                  {/* Answer form for proposer/curator */}
                  {!q.answer && isProposer && (
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
                            <Button
                              size="sm"
                              onClick={() => handleAnswer(q._id)}
                            >
                              Submit Answer
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
                          onClick={() => setAnsweringId(q._id)}
                        >
                          Answer
                        </Button>
                      )}
                    </>
                  )}

                  {/* Publish/Unpublish toggle */}
                  {q.answer && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTogglePublish(q._id, q.isPublished)}
                    >
                      {q.isPublished ? 'Unpublish' : 'Publish'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No questions yet. Be the first to ask!
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ask a Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Ask a question about this problem..."
              className="min-h-[80px]"
            />
            <Button
              onClick={handleAskQuestion}
              disabled={!newQuestion.trim()}
              size="sm"
            >
              Submit Question
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
