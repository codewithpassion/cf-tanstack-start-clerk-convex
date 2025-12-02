import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SignIn, useAuth } from '@clerk/tanstack-react-start'
import { useEffect } from 'react'

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || '/',
    }
  },
})

function SignInPage() {
  const { isSignedIn } = useAuth()
  const navigate = useNavigate()
  const { redirect } = Route.useSearch()

  useEffect(() => {
    // If user is already signed in, redirect them
    if (isSignedIn) {
      navigate({ to: redirect as string })
    }
  }, [isSignedIn, navigate, redirect])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          afterSignInUrl={redirect as string}
        />
      </div>
    </div>
  )
}
