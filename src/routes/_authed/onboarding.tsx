import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { LoadingState } from "@/components/shared/LoadingState";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/_authed/onboarding")({
	component: OnboardingPage,
});

/**
 * Onboarding wizard page for new users.
 * Redirects to dashboard if onboarding is already complete.
 */
function OnboardingPage() {
	const navigate = useNavigate();
	const needsOnboarding = useQuery(api.workspaces.needsOnboarding);

	// Handle wizard completion
	const handleComplete = (projectId: Id<"projects">) => {
		// Navigate to the newly created project
		navigate({
			to: "/projects/$projectId/categories",
			params: { projectId },
		});
	};

	// Show loading state while checking onboarding status
	if (needsOnboarding === undefined) {
		return (
			<div className="max-w-7xl mx-auto">
				<LoadingState message="Loading..." />
			</div>
		);
	}

	// Redirect to dashboard if onboarding is already complete
	if (needsOnboarding === false) {
		navigate({ to: "/dashboard" });
		return null;
	}

	// Show onboarding wizard
	return (
		<OnboardingWizard
			isOpen={true}
			onComplete={handleComplete}
		/>
	);
}
