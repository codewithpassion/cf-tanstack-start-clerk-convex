import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Link } from "@tanstack/react-router";
import { ConvexError } from "convex/values";
import { useTheme } from "next-themes";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useOrg } from "@/contexts/org-context";
import { draftStatusLabel, draftStatusVariant } from "@/lib/draft-status";
import { useKeyboardShortcuts } from "@/lib/keyboard-shortcuts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { SourcePanel } from "@/components/source-panel";

type DraftWithEntries = Doc<"drafts"> & { entries: Doc<"entries">[] };

const AUTOSAVE_DELAY_MS = 1000;
const GENERATION_ERROR_MARKER = "GENERATION ERROR:";

type SaveState = "idle" | "saving" | "saved" | "error" | "dirty";

export function DraftEditor({ draft }: { draft: DraftWithEntries }) {
	const org = useOrg();
	const update = useMutation(api.drafts.update);
	const finalize = useMutation(api.drafts.finalize);
	const reopen = useMutation(api.drafts.reopen);
	const { resolvedTheme } = useTheme();

	const [body, setBody] = useState(draft.body);
	const [title, setTitle] = useState(draft.title);
	const [saveState, setSaveState] = useState<SaveState>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [finalizing, setFinalizing] = useState(false);
	const [reopening, setReopening] = useState(false);
	const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastSyncedBody = useRef(draft.body);
	const lastSyncedTitle = useRef(draft.title);
	const draftId = draft._id as Id<"drafts">;
	const isFinalized = draft.status === "finalized";
	const isGenerating = draft.status === "generating";
	const editable = !isFinalized && !isGenerating;

	useEffect(() => setMounted(true), []);

	// Reconcile remote updates that happen while we're not editing.
	useEffect(() => {
		if (saveState === "idle" || saveState === "saved") {
			if (draft.body !== lastSyncedBody.current) {
				setBody(draft.body);
				lastSyncedBody.current = draft.body;
			}
			if (draft.title !== lastSyncedTitle.current) {
				setTitle(draft.title);
				lastSyncedTitle.current = draft.title;
			}
		}
	}, [draft.body, draft.title, saveState]);

	useEffect(() => {
		return () => {
			if (saveTimer.current) clearTimeout(saveTimer.current);
		};
	}, []);

	const scheduleSave = (next: { body?: string; title?: string }) => {
		if (!editable) return;
		setSaveState("dirty");
		if (saveTimer.current) clearTimeout(saveTimer.current);
		saveTimer.current = setTimeout(async () => {
			setSaveState("saving");
			try {
				await update({
					orgId: org.orgId,
					draftId,
					...next,
				});
				if (next.body !== undefined) lastSyncedBody.current = next.body;
				if (next.title !== undefined) lastSyncedTitle.current = next.title;
				setSaveState("saved");
				setErrorMessage(null);
			} catch (err) {
				setSaveState("error");
				setErrorMessage(
					err instanceof ConvexError
						? typeof err.data === "string"
							? err.data
							: "Failed to save"
						: err instanceof Error
							? err.message
							: "Failed to save",
				);
			}
		}, AUTOSAVE_DELAY_MS);
	};

	const onBodyChange = (next: string) => {
		setBody(next);
		scheduleSave({ body: next });
	};

	const onTitleChange = (next: string) => {
		setTitle(next);
		if (next.trim().length === 0) {
			setSaveState("dirty");
			return;
		}
		scheduleSave({ title: next });
	};

	const onFinalize = async () => {
		setFinalizing(true);
		try {
			// Flush any pending edits first.
			if (saveTimer.current) {
				clearTimeout(saveTimer.current);
				saveTimer.current = null;
				await update({ orgId: org.orgId, draftId, body, title });
				lastSyncedBody.current = body;
				lastSyncedTitle.current = title;
			}
			await finalize({ orgId: org.orgId, draftId });
			setSaveState("saved");
			setErrorMessage(null);
		} catch (err) {
			setErrorMessage(
				err instanceof ConvexError
					? typeof err.data === "string"
						? err.data
						: "Failed to finalize"
					: err instanceof Error
						? err.message
						: "Failed to finalize",
			);
		} finally {
			setFinalizing(false);
		}
	};

	const forceSave = async () => {
		if (!editable) return;
		if (saveTimer.current) {
			clearTimeout(saveTimer.current);
			saveTimer.current = null;
		}
		setSaveState("saving");
		try {
			await update({ orgId: org.orgId, draftId, body, title });
			lastSyncedBody.current = body;
			lastSyncedTitle.current = title;
			setSaveState("saved");
			setErrorMessage(null);
		} catch (err) {
			setSaveState("error");
			setErrorMessage(
				err instanceof ConvexError
					? typeof err.data === "string"
						? err.data
						: "Failed to save"
					: err instanceof Error
						? err.message
						: "Failed to save",
			);
		}
	};

	useKeyboardShortcuts({
		"mod+s": () => {
			void forceSave();
		},
		"mod+enter": editable ? () => setFinalizeDialogOpen(true) : undefined,
	});

	const onReopen = async () => {
		setReopening(true);
		try {
			await reopen({ orgId: org.orgId, draftId });
		} catch (err) {
			setErrorMessage(
				err instanceof ConvexError
					? typeof err.data === "string"
						? err.data
						: "Failed to reopen"
					: err instanceof Error
						? err.message
						: "Failed to reopen",
			);
		} finally {
			setReopening(false);
		}
	};

	const hasGenerationError =
		!isGenerating && body.includes(GENERATION_ERROR_MARKER);

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Button variant="ghost" size="sm" asChild>
					<Link to="/org/$slug/drafts" params={{ slug: org.slug }}>
						<ArrowLeft className="size-4 mr-1" />
						Back to drafts
					</Link>
				</Button>
				<div className="flex items-center gap-2">
					<SaveIndicator state={saveState} message={errorMessage} />
					<Badge variant={draftStatusVariant(draft.status)} className="gap-1">
						{isGenerating && <Spinner className="size-3" />}
						{draftStatusLabel(draft.status)}
					</Badge>
					{editable && (
						<AlertDialog
							open={finalizeDialogOpen}
							onOpenChange={setFinalizeDialogOpen}
						>
							<AlertDialogTrigger asChild>
								<Button size="sm" disabled={finalizing || saveState === "saving"}>
									{finalizing ? (
										<Loader2 className="size-4 mr-1 animate-spin" />
									) : (
										<CheckCircle2 className="size-4 mr-1" />
									)}
									Finalize
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Finalize this draft?</AlertDialogTitle>
									<AlertDialogDescription>
										The draft will become read-only and every source story will
										be marked as used so it won't get recycled. You can reopen
										it later.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction onClick={onFinalize}>
										Finalize
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
					{isFinalized && (
						<Button
							size="sm"
							variant="outline"
							onClick={onReopen}
							disabled={reopening}
						>
							{reopening ? (
								<Loader2 className="size-4 mr-1 animate-spin" />
							) : null}
							Reopen
						</Button>
					)}
				</div>
			</div>

			{hasGenerationError && (
				<Alert variant="destructive">
					<AlertTriangle />
					<AlertTitle>Draft generation reported an error</AlertTitle>
					<AlertDescription>
						Look for the "{GENERATION_ERROR_MARKER}" line in the body. You can
						edit the draft manually or re-run generation from the inbox.
					</AlertDescription>
				</Alert>
			)}

			<Input
				value={title}
				onChange={(e) => onTitleChange(e.target.value)}
				disabled={!editable}
				placeholder="Draft title"
				className="text-xl font-semibold h-12"
			/>

			<div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-4">
				<div className="min-w-0">
					{isGenerating ? (
						<div className="space-y-2">
							<Skeleton className="h-6 w-1/3" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-11/12" />
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-64 w-full" />
						</div>
					) : mounted ? (
						<MarkdownEditor
							value={body}
							onChange={onBodyChange}
							readOnly={!editable}
							theme={resolvedTheme === "dark" ? "dark" : "light"}
						/>
					) : (
						<Skeleton className="h-96 w-full" />
					)}
				</div>
				<aside className="space-y-3">
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-semibold">Source stories</h2>
						<span className="text-xs text-muted-foreground">
							{draft.entries.length}
						</span>
					</div>
					<Separator />
					<SourcePanel slug={org.slug} entries={draft.entries} />
				</aside>
			</div>
		</div>
	);
}

function SaveIndicator({
	state,
	message,
}: {
	state: SaveState;
	message: string | null;
}) {
	if (state === "saving") {
		return (
			<span className="text-xs text-muted-foreground flex items-center gap-1">
				<Spinner className="size-3" /> Saving…
			</span>
		);
	}
	if (state === "saved") {
		return <span className="text-xs text-muted-foreground">Saved</span>;
	}
	if (state === "dirty") {
		return (
			<span className="text-xs text-muted-foreground">Unsaved changes</span>
		);
	}
	if (state === "error") {
		return (
			<span className="text-xs text-destructive">
				{message ?? "Save failed"}
			</span>
		);
	}
	return null;
}

interface MarkdownEditorProps {
	value: string;
	onChange: (next: string) => void;
	readOnly: boolean;
	theme: "light" | "dark";
}

function MarkdownEditor({
	value,
	onChange,
	readOnly,
	theme,
}: MarkdownEditorProps) {
	const [Editor, setEditor] = useState<null | typeof import(
		"@uiw/react-md-editor"
	)>(null);

	useEffect(() => {
		let cancelled = false;
		import("@uiw/react-md-editor").then((mod) => {
			if (!cancelled) setEditor(mod);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	if (!Editor) {
		return <Skeleton className="h-96 w-full" />;
	}
	const MDEditor = Editor.default;
	return (
		<div data-color-mode={theme} className="rounded-lg overflow-hidden border">
			<MDEditor
				value={value}
				onChange={(v) => onChange(v ?? "")}
				height={600}
				preview={readOnly ? "preview" : "live"}
				visibleDragbar={false}
				textareaProps={{
					readOnly,
					placeholder: "Start writing the draft in markdown…",
				}}
			/>
		</div>
	);
}
