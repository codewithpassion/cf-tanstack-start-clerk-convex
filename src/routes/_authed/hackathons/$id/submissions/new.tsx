import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormLabel,
	FormMessage,
	FormDescription,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUpload } from "@/components/FileUpload";

export const Route = createFileRoute(
	"/_authed/hackathons/$id/submissions/new",
)({
	component: NewSubmissionPage,
});

const formSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().min(1, "Description is required"),
	problemId: z.string().optional(),
	categoryIds: z.array(z.string()),
	githubUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
	liveDemoUrl: z
		.string()
		.url("Must be a valid URL")
		.or(z.literal(""))
		.optional(),
	videoUrl: z.string().optional(),
	deckUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function NewSubmissionPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const hackathonId = id as Id<"hackathons">;

	const categories = useQuery(api.categories.listByHackathon, {
		hackathonId,
	});
	const problems = useQuery(api.problems.listApprovedByHackathon, {
		hackathonId,
	});

	const createSubmission = useMutation(api.submissions.create);
	const submitSubmission = useMutation(api.submissions.submit);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: "",
			description: "",
			problemId: "",
			categoryIds: [],
			githubUrl: "",
			liveDemoUrl: "",
			videoUrl: "",
			deckUrl: "",
		},
	});

	// Get the teamId from URL search params (passed from team dashboard).
	const searchParams = new URLSearchParams(
		typeof window !== "undefined" ? window.location.search : "",
	);
	const teamId = searchParams.get("teamId") as Id<"teams"> | null;

	async function onSave(values: FormValues, shouldSubmit: boolean) {
		if (!teamId) {
			toast.error(
				"Team ID is required. Please access this page from your team.",
			);
			return;
		}

		try {
			const submissionId = await createSubmission({
				hackathonId,
				teamId,
				title: values.title,
				description: values.description,
				categoryIds: values.categoryIds.filter(Boolean) as Id<"categories">[],
				problemId: values.problemId
					? (values.problemId as Id<"problems">)
					: undefined,
				githubUrl: values.githubUrl || undefined,
				liveDemoUrl: values.liveDemoUrl || undefined,
				videoUrl: values.videoUrl || undefined,
				deckUrl: values.deckUrl || undefined,
			});

			if (shouldSubmit) {
				await submitSubmission({ id: submissionId });
				toast.success("Submission created and submitted");
			} else {
				toast.success("Draft saved");
			}

			navigate({
				to: "/hackathons/$id/submissions/$submissionId",
				params: { id, submissionId: submissionId as string },
			});
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Failed to create submission",
			);
		}
	}

	if (categories === undefined || problems === undefined) {
		return (
			<div className="max-w-3xl mx-auto space-y-4">
				<Skeleton className="h-10 w-48" />
				<Skeleton className="h-64" />
			</div>
		);
	}

	return (
		<div className="max-w-3xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">New Submission</h1>

			<Card>
				<CardHeader>
					<CardTitle>Submission Details</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form
							className="space-y-6"
							onSubmit={(e) => e.preventDefault()}
						>
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<div className="space-y-1">
										<FormLabel>Title *</FormLabel>
										<FormControl>
											<Input
												placeholder="Your project name"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</div>
								)}
							/>

							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<div className="space-y-1">
										<FormLabel>Description *</FormLabel>
										<FormDescription>
											Describe your project. Markdown is supported.
										</FormDescription>
										<FormControl>
											<Textarea
												rows={8}
												placeholder="What does your project do? How did you build it?"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</div>
								)}
							/>

							{problems && problems.length > 0 && (
								<FormField
									control={form.control}
									name="problemId"
									render={({ field }) => (
										<div className="space-y-1">
											<FormLabel>Problem (optional)</FormLabel>
											<FormDescription>
												Select the problem this submission addresses
											</FormDescription>
											<FormControl>
												<Select
													value={field.value}
													onValueChange={field.onChange}
												>
													<SelectTrigger>
														<SelectValue placeholder="None" />
													</SelectTrigger>
													<SelectContent>
														{problems.map((p) => (
															<SelectItem
																key={p._id}
																value={p._id}
															>
																{p.title}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</div>
									)}
								/>
							)}

							{categories && categories.length > 0 && (
								<FormField
									control={form.control}
									name="categoryIds"
									render={() => (
										<div className="space-y-2">
											<FormLabel>Categories</FormLabel>
											<div className="grid grid-cols-2 gap-2">
												{categories.map((cat) => (
													<FormField
														key={cat._id}
														control={form.control}
														name="categoryIds"
														render={({ field }) => (
															<label className="flex items-center gap-2 text-sm">
																<Checkbox
																	checked={field.value.includes(
																		cat._id,
																	)}
																	onCheckedChange={(
																		checked,
																	) => {
																		if (checked) {
																			field.onChange([
																				...field.value,
																				cat._id,
																			]);
																		} else {
																			field.onChange(
																				field.value.filter(
																					(v: string) =>
																						v !==
																						cat._id,
																				),
																			);
																		}
																	}}
																/>
																{cat.name}
															</label>
														)}
													/>
												))}
											</div>
											<FormMessage />
										</div>
									)}
								/>
							)}

							<FormField
								control={form.control}
								name="githubUrl"
								render={({ field }) => (
									<div className="space-y-1">
										<FormLabel>GitHub URL (optional)</FormLabel>
										<FormControl>
											<Input
												placeholder="https://github.com/..."
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</div>
								)}
							/>

							<FormField
								control={form.control}
								name="liveDemoUrl"
								render={({ field }) => (
									<div className="space-y-1">
										<FormLabel>Live Demo URL (optional)</FormLabel>
										<FormControl>
											<Input
												placeholder="https://your-demo.com"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</div>
								)}
							/>

							<FormField
								control={form.control}
								name="videoUrl"
								render={({ field }) => (
									<div className="space-y-1">
										<FileUpload
											label="Video (optional)"
											accept="video/*"
											type="video"
											maxSizeMB={100}
											value={field.value}
											onChange={field.onChange}
											onClear={() => field.onChange("")}
											helperText="Max 100MB, any video format"
										/>
									</div>
								)}
							/>

							<FormField
								control={form.control}
								name="deckUrl"
								render={({ field }) => (
									<div className="space-y-1">
										<FileUpload
											label="Slide Deck (optional)"
											accept=".pdf,.pptx"
											type="deck"
											maxSizeMB={50}
											value={field.value}
											onChange={field.onChange}
											onClear={() => field.onChange("")}
											helperText="PDF or PPTX, max 50MB"
										/>
									</div>
								)}
							/>

							<div className="flex gap-3 justify-end pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={form.handleSubmit((v) =>
										onSave(v, false),
									)}
								>
									Save as Draft
								</Button>
								<Button
									type="button"
									onClick={form.handleSubmit((v) =>
										onSave(v, true),
									)}
								>
									Submit
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
