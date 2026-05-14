import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { useState } from 'react'
import { ShortcutsCheatsheet } from '@/components/shortcuts-cheatsheet'
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts'
import { useMaybeOrg } from '@/contexts/org-context'
import { emitShortcutEvent, SHORTCUT_EVENTS } from '@/lib/shortcut-events'

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
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false)
  const navigate = useNavigate()
  const org = useMaybeOrg()
  const slug = org?.slug

  useKeyboardShortcuts({
    "?": () => setCheatsheetOpen((s) => !s),
    "mod+k": () => emitShortcutEvent(SHORTCUT_EVENTS.openAiSearch),
    o: () => emitShortcutEvent(SHORTCUT_EVENTS.openOrgSwitcher),
    "g o": () => navigate({ to: "/orgs" }),
    "g g": slug
      ? () => navigate({ to: "/org/$slug/dashboard", params: { slug } })
      : undefined,
    "g i": slug
      ? () => navigate({ to: "/org/$slug/inbox", params: { slug } })
      : undefined,
    "g s": slug
      ? () => navigate({ to: "/org/$slug/sources", params: { slug } })
      : undefined,
    "g d": slug
      ? () => navigate({ to: "/org/$slug/drafts", params: { slug } })
      : undefined,
  })

  return (
    <div className="container mx-auto p-6">
      <Outlet />
      <ShortcutsCheatsheet open={cheatsheetOpen} onOpenChange={setCheatsheetOpen} />
    </div>
  )
}
