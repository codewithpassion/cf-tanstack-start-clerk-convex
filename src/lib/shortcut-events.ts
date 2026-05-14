// Lightweight pub-sub for cross-component shortcut dispatch (e.g. opening the
// org switcher from the global shortcut layer without prop-drilling through
// the header). Keep this tiny — only used for one-off UI nudges.

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

export function emitShortcutEvent(name: string) {
	const set = listeners.get(name);
	if (!set) return;
	for (const fn of set) fn();
}

export function subscribeShortcutEvent(
	name: string,
	listener: Listener,
): () => void {
	let set = listeners.get(name);
	if (!set) {
		set = new Set();
		listeners.set(name, set);
	}
	set.add(listener);
	return () => {
		set?.delete(listener);
		if (set && set.size === 0) listeners.delete(name);
	};
}

export const SHORTCUT_EVENTS = {
	openOrgSwitcher: "openOrgSwitcher",
	openAiSearch: "openAiSearch",
	searchPerformed: "searchPerformed",
} as const;
