import { useMemo } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import {
	SHORTCUT_CHEATSHEET,
	type ShortcutDescriptor,
} from "@/lib/keyboard-shortcuts";

export function ShortcutsCheatsheet({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (next: boolean) => void;
}) {
	const grouped = useMemo(() => {
		const map = new Map<string, ShortcutDescriptor[]>();
		for (const s of SHORTCUT_CHEATSHEET) {
			const group = s.group ?? "Other";
			const arr = map.get(group) ?? [];
			arr.push(s);
			map.set(group, arr);
		}
		return Array.from(map.entries());
	}, []);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Keyboard shortcuts</DialogTitle>
					<DialogDescription>
						Press <Kbd>?</Kbd> any time to open this list.
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-h-[60vh] overflow-y-auto">
					{grouped.map(([group, items]) => (
						<div key={group}>
							<h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-semibold">
								{group}
							</h3>
							<ul className="space-y-1.5">
								{items.map((item) => (
									<li
										key={`${group}-${item.keys}-${item.label}`}
										className="flex items-center justify-between gap-3 text-sm"
									>
										<span>{item.label}</span>
										<Kbd>{item.keys}</Kbd>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
