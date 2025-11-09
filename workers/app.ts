import {
    createStartHandler,
    defaultStreamHandler,
} from '@tanstack/react-start/server'
import serverEntry from "@tanstack/react-start/server-entry"
import { Hono } from "hono";

interface CloudflareVariables {
}

export type AppType = {
    Bindings: Cloudflare.Env;
    Variables: CloudflareVariables;
};

const app = new Hono<AppType>();

app.get("/api/health", (c) => {
    return c.json({ status: "ok" });
});


// const fetch = createStartHandler(defaultStreamHandler)

app.use(async (c) => {
    return serverEntry.fetch(c.req.raw);
    // const s = new ServerEntry<AppType>()
    // return serverEntry.handleRequest(c.req.raw);
    // return fetch(c.req.raw);
});


export default {
    fetch: app.fetch,
} satisfies ExportedHandler<globalThis.Cloudflare.Env>;
