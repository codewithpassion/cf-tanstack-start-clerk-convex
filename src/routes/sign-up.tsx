import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SignUp, useAuth } from '@clerk/tanstack-react-start'
import { useEffect } from 'react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/sign-up')({
  component: SignUpPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || '/',
    }
  },
})

function SignUpPage() {
  const { isSignedIn } = useAuth()
  const navigate = useNavigate()
  const { redirect } = Route.useSearch()

  useEffect(() => {
    if (isSignedIn) {
      navigate({ to: redirect as string })
    }
  }, [isSignedIn, navigate, redirect])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign Up</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            afterSignUpUrl={redirect as string}
          />
        </CardContent>
      </Card>
    </div>
  )
}
