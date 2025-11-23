import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ClerkProvider } from '@clerk/tanstack-react-start'

import Header from '../components/Header'

import appCss from '../styles.css?url'
import { ConvexClientProvider } from '@/lib/convex'
import { AuthProvider } from '@/contexts/auth-context'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],

  }),

  shellComponent: RootDocument,
  notFoundComponent: () => <div>404 - Not Found</div>,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexClientProvider convexUrl={import.meta.env.VITE_CONVEX_URL}>
        <AuthProvider>
          <html lang="en">
            <head>
              <HeadContent />
            </head>
            <body>
              <Header />
              {children}
              <TanStackDevtools
                config={{
                  position: 'bottom-right',
                }}
                plugins={[
                  {
                    name: 'Tanstack Router',
                    render: <TanStackRouterDevtoolsPanel />,
                  },
                ]}
              />
              <Scripts />
            </body>
          </html>
        </AuthProvider>
      </ConvexClientProvider>
    </ClerkProvider>
  )
}
