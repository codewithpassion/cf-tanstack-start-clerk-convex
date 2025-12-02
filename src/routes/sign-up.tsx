import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SignUp, useAuth } from '@clerk/tanstack-react-start'
import { useEffect } from 'react'

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
    // If user is already signed in, redirect them
    if (isSignedIn) {
      navigate({ to: redirect as string })
    }
  }, [isSignedIn, navigate, redirect])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          afterSignUpUrl={redirect as string}
        />
      </div>
    </div>
  )
}
