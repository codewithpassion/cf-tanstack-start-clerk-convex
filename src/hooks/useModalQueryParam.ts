import { useNavigate, useSearch } from "@tanstack/react-router";

/**
 * Hook to sync modal open/close state with URL query parameters.
 * Enables deep linking and browser back/forward support for modals.
 *
 * @param modalKey - The query param value for this modal (e.g., "brand-voices")
 * @returns [isOpen, open, close] tuple
 *
 * @example
 * const [isOpen, open, close] = useModalQueryParam('brand-voices');
 * // When open(): URL becomes /projects/:id?modal=brand-voices
 * // When close(): URL becomes /projects/:id
 */
export function useModalQueryParam(modalKey: string): [boolean, () => void, () => void] {
	const navigate = useNavigate();
	const search = useSearch({ from: "/_authed/projects/$projectId" }) as { modal?: string };

	const isOpen = search.modal === modalKey;

	const open = () => {
		navigate({
			search: (prev: any) => ({ ...prev, modal: modalKey }) as any,
		} as any);
	};

	const close = () => {
		navigate({
			search: (prev: any) => {
				const { modal, ...rest } = prev as any;
				return rest;
			},
		} as any);
	};

	return [isOpen, open, close];
}
