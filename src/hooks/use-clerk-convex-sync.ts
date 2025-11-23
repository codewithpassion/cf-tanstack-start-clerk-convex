import { useUser } from "@clerk/tanstack-react-start";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

/**
 * Hook to automatically sync Clerk user data to Convex database
 * This ensures the user exists in Convex when they sign in
 */
export function useClerkConvexSync() {
	const { user, isSignedIn, isLoaded } = useUser();
	const syncUser = useMutation(api.users.syncUser);

	useEffect(() => {
		if (!isLoaded || !isSignedIn || !user) {
			return;
		}

		// Sync user data to Convex
		const sync = async () => {
			try {
				const roles = (user.publicMetadata?.roles as string[]) || ["user"];
				await syncUser({
					clerkId: user.id,
					email: user.primaryEmailAddress?.emailAddress || "",
					name: user.fullName || user.firstName || undefined,
					imageUrl: user.imageUrl || undefined,
					roles,
				});
			} catch (error) {
				console.error("Failed to sync user to Convex:", error);
			}
		};

		sync();
	}, [user, isSignedIn, isLoaded, syncUser]);
}
