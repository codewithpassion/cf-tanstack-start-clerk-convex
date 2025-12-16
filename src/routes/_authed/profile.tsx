import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { useUser } from '@clerk/tanstack-react-start'
import { useQuery } from 'convex/react'
import { api } from '@/convex/api'
import { Coins } from 'lucide-react'

// Server function to fetch user data
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

  // Get token account data
  const convexUser = useQuery(api.users.getMe)
  const account = useQuery(
    api.billing.accounts.getAccount,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  )

  if (!isLoaded) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Loading...</h1>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">User Profile</h1>

      {/* Token Balance Card */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-900 border border-amber-200 dark:border-slate-800 shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
          Token Balance
        </h2>
        {account ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Coins size={32} className="text-amber-600 dark:text-amber-500" />
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {account.balance.toLocaleString()}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">tokens available</p>
              </div>
            </div>
            <Link to="/settings/billing">
              <button
                type="button"
                className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
              >
                Manage Tokens & Billing
              </button>
            </Link>
          </div>
        ) : (
          <p className="text-slate-600 dark:text-slate-400">Loading token balance...</p>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Client-Side User Data</h2>
        <div className="space-y-2">
          <p className="text-slate-900 dark:text-white">
            <span className="font-medium">Name:</span>{' '}
            {user?.fullName || 'Not provided'}
          </p>
          <p className="text-slate-900 dark:text-white">
            <span className="font-medium">Email:</span>{' '}
            {user?.primaryEmailAddress?.emailAddress || 'Not provided'}
          </p>
          <p className="text-slate-900 dark:text-white">
            <span className="font-medium">User ID:</span> {user?.id}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Server-Side Data</h2>
        <div className="space-y-2">
          <p className="text-slate-900 dark:text-white">
            <span className="font-medium">User ID from server:</span>{' '}
            {loaderData.userId}
          </p>
          <p className="text-slate-900 dark:text-white">
            <span className="font-medium">Message:</span>{' '}
            {loaderData.serverMessage}
          </p>
        </div>
      </div>
    </div>
  )
}
