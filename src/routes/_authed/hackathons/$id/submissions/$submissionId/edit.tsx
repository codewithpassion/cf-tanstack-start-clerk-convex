import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useEffect } from "react";

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
	"/_authed/hackathons/$id/submissions/$submissionId/edit",
)({
	component: EditSubmissionPage,
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

function EditSubmissionPage() {
	const { id, submissionId } = Route.useParams();
	const navigate = useNavigate();
	const hackathonId = id as Id<"hackathons">;

	const submission = useQuery(api.submissions.getById, {
		id: submissionId as Id<"submissions">,
	});
	const categories = useQuery(api.categories.listByHackathon, {
		hackathonId,
	});
	const problems = useQuery(api.problems.listApprovedByHackathon, {
		hackathonId,
	});

	const updateSubmission = useMutation(api.submissions.update);

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

	// Populate form when submission loads
	useEffect(() => {
		if (submission) {
			form.reset({
				title: submission.title,
				description: submission.description,
				problemId: submission.problemId ?? "",
				categoryIds: submission.categoryIds as string[],
				githubUrl: submission.githubUrl ?? "",
				liveDemoUrl: submission.liveDemoUrl ?? "",
				videoUrl: submission.videoUrl ?? "",
				deckUrl: submission.deckUrl ?? "",
			});
		}
	}, [submission, form]);

	async function onSave(values: FormValues) {
		try {
			const newId = await updateSubmission({
				id: submissionId as Id<"submissions">,
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

			toast.success("New version saved");
			navigate({
				to: "/hackathons/$id/submissions/$submissionId",
				params: { id, submissionId: newId as string },
			});
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Failed to update submission",
			);
		}
	}

	if (
		submission === undefined ||
		categories === undefined ||
		problems === undefined
	) {
		return (
			<div className="max-w-3xl mx-auto space-y-4">
				<Skeleton className="h-10 w-48" />
				<Skeleton className="h-64" />
			</div>
		);
	}

	if (submission === null) {
		return (
			<div className="max-w-3xl mx-auto">
				<h1 className="text-2xl font-bold mb-4">Submission Not Found</h1>
			</div>
		);
	}

	if (
		submission.status === "approved" ||
		submission.status === "rejected"
	) {
		return (
			<div className="max-w-3xl mx-auto">
				<h1 className="text-2xl font-bold mb-4">Cannot Edit</h1>
				<p className="text-muted-foreground">
					This submission has been {submission.status} and can no longer be
					edited.
				</p>
			</div>
		);
	}

	return (
		<div className="max-w-3xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">
				Edit Submission (v{submission.version})
			</h1>

			<Card>
				<CardHeader>
					<CardTitle>Submission Details</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form
							className="space-y-6"
							onSubmit={form.handleSubmit(onSave)}
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
												placeholder="What does your project do?"
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
											<FormLabel>
												Problem (optional)
											</FormLabel>
											<FormControl>
												<Select
													value={field.value}
													onValueChange={
														field.onChange
													}
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
														render={({
															field,
														}) => (
															<label className="flex items-center gap-2 text-sm">
																<Checkbox
																	checked={field.value.includes(
																		cat._id,
																	)}
																	onCheckedChange={(
																		checked,
																	) => {
																		if (
																			checked
																		) {
																			field.onChange(
																				[
																					...field.value,
																					cat._id,
																				],
																			);
																		} else {
																			field.onChange(
																				field.value.filter(
																					(
																						v: string,
																					) =>
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
										<FormLabel>
											GitHub URL (optional)
										</FormLabel>
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
										<FormLabel>
											Live Demo URL (optional)
										</FormLabel>
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
											onClear={() =>
												field.onChange("")
											}
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
											onClear={() =>
												field.onChange("")
											}
											helperText="PDF or PPTX, max 50MB"
										/>
									</div>
								)}
							/>

							<div className="flex gap-3 justify-end pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										navigate({
											to: "/hackathons/$id/submissions/$submissionId",
											params: { id, submissionId },
										})
									}
								>
									Cancel
								</Button>
								<Button type="submit">
									Save New Version
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
