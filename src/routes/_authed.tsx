import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'

// Server function to check authentication
const checkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId } = await auth()

  if (!userId) {
    throw redirect({
      to: '/sign-in',
      search: {
        redirect: globalThis.location?.pathname || '/',
      },
    })
  }

  return { userId }
})

export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    // Check authentication before loading any protected route
    await checkAuth()
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  return <Outlet />
}
