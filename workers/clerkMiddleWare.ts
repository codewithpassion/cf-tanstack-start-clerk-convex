import { createClerkClient } from '@clerk/backend'
import type { ClerkClient, SessionAuthObject } from '@clerk/backend'
import type { AuthenticateRequestOptions } from '@clerk/backend/internal'
import { TokenType } from '@clerk/backend/internal'
import type { Context, MiddlewareHandler } from 'hono'
import { env } from 'hono/adapter'



export type ClerkAuthVariables = {
    clerk: ClerkClient
    clerkAuth: () => SessionAuthObject | null
}

export const getAuth = (c: Context): SessionAuthObject | null => {
    const authFn = c.get('clerkAuth')
    return authFn()
}

type ClerkEnv = {
    CLERK_SECRET_KEY: string
    CLERK_PUBLISHABLE_KEY: string
    CLERK_API_URL: string
    CLERK_API_VERSION: string
}

type ClerkMiddlewareOptions = Omit<AuthenticateRequestOptions, 'acceptsToken'>

// Helper to parse standard Cookie header into a Map
const parseCookies = (cookieHeader: string | null) => {
    const map = new Map<string, string>();
    if (!cookieHeader) return map;
    cookieHeader.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name && rest) {
            // Handle cases where value might have '=' in it
            map.set(name, rest.join('='));
        }
    });
    return map;
};

export const clerkMiddleware = (options?: ClerkMiddlewareOptions): MiddlewareHandler => {
    return async (c, next) => {
        debugger
        const clerkEnv = env<ClerkEnv>(c)
        const { secretKey, publishableKey, apiUrl, apiVersion, ...rest } = options || {
            secretKey: clerkEnv.CLERK_SECRET_KEY || '',
            publishableKey: clerkEnv.CLERK_PUBLISHABLE_KEY || '',
            apiUrl: clerkEnv.CLERK_API_URL,
            apiVersion: clerkEnv.CLERK_API_VERSION,
        }
        if (!secretKey) {
            throw new Error('Missing Clerk Secret key')
        }

        if (!publishableKey) {
            throw new Error('Missing Clerk Publishable key')
        }

        const clerkClient = createClerkClient({
            ...rest,
            apiUrl,
            apiVersion,
            secretKey,
            publishableKey,
        })


        const rawReq = c.req.raw;
        const frankensteinRequest = {
            url: rawReq.url,
            method: rawReq.method,
            headers: rawReq.headers,
            cookies: parseCookies(rawReq.headers.get('cookie')),
            // Add these if Clerk specifically complains they are missing,
            // but for pure auth verification, headers+cookies usually suffice.
            // text: () => rawReq.text(), 
            // json: () => rawReq.json(),
        }
        const requestState = await clerkClient.authenticateRequest(frankensteinRequest as unknown as Request, {
            ...rest,
            secretKey,
            publishableKey,
            acceptsToken: TokenType.SessionToken,
        })

        if (requestState.headers) {
            requestState.headers.forEach((value, key) => {
                c.res.headers.append(key, value)
            })

            const locationHeader = requestState.headers.get('location')

            if (locationHeader) {
                return c.redirect(locationHeader, 307)
            } else if (requestState.status === 'handshake') {
                throw new Error('Clerk: unexpected handshake without redirect')
            }
        }

        // Options will be added soon
        c.set('clerkAuth', () => requestState.toAuth())
        c.set('clerk', clerkClient)

        await next()
    }
}