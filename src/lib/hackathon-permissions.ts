export type HackathonRole =
	| "owner"
	| "organiser"
	| "curator"
	| "judge"
	| "participant"
	| null;

export function canManageHackathon(role: HackathonRole): boolean {
	return role === "owner" || role === "organiser";
}

export function canCurateProblems(role: HackathonRole): boolean {
	return role === "owner" || role === "organiser" || role === "curator";
}

export function canJudge(role: HackathonRole): boolean {
	return role === "owner" || role === "organiser" || role === "judge";
}

export function canSubmitProblems(role: HackathonRole): boolean {
	return (
		role === "participant" || role === "organiser" || role === "owner"
	);
}

export function canSubmitSolutions(role: HackathonRole): boolean {
	return role === "participant";
}

export function getRoleDisplayName(role: HackathonRole): string {
	switch (role) {
		case "owner":
			return "Owner";
		case "organiser":
			return "Organiser";
		case "curator":
			return "Curator";
		case "judge":
			return "Judge";
		case "participant":
			return "Participant";
		default:
			return "No Role";
	}
}
