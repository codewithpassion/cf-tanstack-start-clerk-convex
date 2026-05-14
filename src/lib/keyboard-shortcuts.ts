import { useEffect, useRef } from "react";

export type ShortcutHandler = (e: KeyboardEvent) => void;

export interface ShortcutMap {
	/**
	 * Single-key shortcuts keyed by `e.key` (lowercased). Modifier-aware keys
	 * use the `mod+k` / `ctrl+k` / `shift+enter` form (see normalizeKey).
	 */
	[combo: string]: ShortcutHandler | undefined;
}

const SEQUENCE_TIMEOUT_MS = 1500;

function shouldIgnore(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	if (target.isContentEditable) return true;
	if (target.closest("code")) return true;
	return false;
}

function comboFromEvent(e: KeyboardEvent): string {
	const key = e.key.toLowerCase();
	const mod = e.metaKey || e.ctrlKey;
	const shift = e.shiftKey;
	const parts: string[] = [];
	if (mod) parts.push("mod");
	if (shift && key.length > 1) parts.push("shift");
	parts.push(key);
	return parts.join("+");
}

export function useKeyboardShortcuts(
	handlers: ShortcutMap,
	options: { enabled?: boolean } = {},
) {
	const enabled = options.enabled ?? true;
	const handlersRef = useRef(handlers);
	handlersRef.current = handlers;

	useEffect(() => {
		if (!enabled) return;
		let sequence = "";
		let sequenceTimer: ReturnType<typeof setTimeout> | null = null;

		const clearSequence = () => {
			sequence = "";
			if (sequenceTimer) {
				clearTimeout(sequenceTimer);
				sequenceTimer = null;
			}
		};

		const onKey = (e: KeyboardEvent) => {
			if (shouldIgnore(e.target)) return;
			const combo = comboFromEvent(e);
			const map = handlersRef.current;

			// Direct combo match (mod combos, single keys like "?", "j", "k").
			const direct = map[combo];
			if (direct) {
				e.preventDefault();
				clearSequence();
				direct(e);
				return;
			}

			// Sequence tracking: only plain alphanumerics with no modifiers can
			// chain into a multi-key shortcut. This avoids capturing things like
			// `cmd+g` into a sequence.
			if (e.metaKey || e.ctrlKey || e.altKey) {
				clearSequence();
				return;
			}
			if (e.key.length !== 1) {
				clearSequence();
				return;
			}

			const next = sequence ? `${sequence} ${e.key.toLowerCase()}` : e.key.toLowerCase();
			const seqHandler = map[next];
			if (seqHandler) {
				e.preventDefault();
				clearSequence();
				seqHandler(e);
				return;
			}

			// Check whether `next` is a prefix of any registered sequence.
			const hasPrefix = Object.keys(map).some((k) => k.startsWith(`${next} `));
			if (hasPrefix) {
				sequence = next;
				if (sequenceTimer) clearTimeout(sequenceTimer);
				sequenceTimer = setTimeout(clearSequence, SEQUENCE_TIMEOUT_MS);
			} else {
				clearSequence();
			}
		};

		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("keydown", onKey);
			if (sequenceTimer) clearTimeout(sequenceTimer);
		};
	}, [enabled]);
}

export interface ShortcutDescriptor {
	keys: string;
	label: string;
	group?: string;
}

export const SHORTCUT_CHEATSHEET: ShortcutDescriptor[] = [
	{ group: "Global", keys: "?", label: "Show keyboard shortcuts" },
	{ group: "Global", keys: "⌘ K", label: "Open AI search" },
	{ group: "Global", keys: "o", label: "Open organization switcher" },
	{ group: "Navigation", keys: "g g", label: "Go to dashboard" },
	{ group: "Navigation", keys: "g i", label: "Go to inbox" },
	{ group: "Navigation", keys: "g s", label: "Go to sources" },
	{ group: "Navigation", keys: "g d", label: "Go to drafts" },
	{ group: "Navigation", keys: "g o", label: "Go to all organizations" },
	{ group: "Inbox", keys: "j / k", label: "Move selection down / up" },
	{ group: "Inbox", keys: "u", label: "Toggle used on highlighted entry" },
	{ group: "Inbox", keys: "e", label: "Archive highlighted entry" },
	{ group: "Inbox", keys: "↵", label: "Open highlighted entry" },
	{ group: "Entry detail", keys: "u", label: "Toggle used" },
	{ group: "Entry detail", keys: "e", label: "Toggle archive" },
	{ group: "Entry detail", keys: "esc", label: "Back to inbox" },
	{ group: "Draft", keys: "⌘ S", label: "Force save" },
	{ group: "Draft", keys: "⌘ ↵", label: "Open finalize dialog" },
];
