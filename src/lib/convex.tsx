import { useAuth } from "@clerk/tanstack-react-start";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { type ReactNode, useState } from "react";

export function ConvexClientProvider({
	children,
	convexUrl,
}: { convexUrl: string; children: ReactNode }) {
	const [convex] = useState(() => new ConvexReactClient(convexUrl));
	return (
		<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
			{children}
		</ConvexProviderWithClerk>
	);
}
