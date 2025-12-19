import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { useAuth } from '@clerk/tanstack-react-start'
import { Info } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

const checkApiHealth = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId } = await auth()

  return {
    status: 'ok',
    userId,
    timestamp: new Date().toISOString(),
  }
})

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardPage,
  loader: async () => {
    const health = await checkApiHealth()
    return health
  },
})

function DashboardPage() {
  const { userId, isLoaded } = useAuth()
  const loaderData = Route.useLoaderData()

  if (!isLoaded) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-32" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Authenticated</span>
              <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                Yes
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">User ID</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {userId}
              </code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Server Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                {loaderData.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Check</span>
              <span className="text-sm">
                {new Date(loaderData.timestamp).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Protected Content</AlertTitle>
        <AlertDescription>
          <p>
            This is a protected dashboard page. Only authenticated users can view
            this content.
          </p>
          <p className="mt-2">
            The authentication check happens on the server before this page loads,
            ensuring secure access control.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}
