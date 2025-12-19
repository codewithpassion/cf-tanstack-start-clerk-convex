import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { useUser } from '@clerk/tanstack-react-start'
import { Server } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

const getUserData = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId } = await auth()

  return {
    userId,
    serverMessage: 'This data was fetched from the server',
  }
})

export const Route = createFileRoute('/_authed/profile')({
  component: ProfilePage,
  loader: async () => {
    const data = await getUserData()
    return data
  },
})

function ProfilePage() {
  const { user, isLoaded } = useUser()
  const loaderData = Route.useLoaderData()

  if (!isLoaded) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-48 mb-6" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">User Profile</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Client-Side User Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">
              {user?.fullName || 'Not provided'}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">
              {user?.primaryEmailAddress?.emailAddress || 'Not provided'}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">User ID</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {user?.id}
            </code>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Server className="h-4 w-4" />
        <AlertTitle>Server-Side Data</AlertTitle>
        <AlertDescription>
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <span>User ID from server:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {loaderData.userId}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span>Message:</span>
              <span>{loaderData.serverMessage}</span>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
