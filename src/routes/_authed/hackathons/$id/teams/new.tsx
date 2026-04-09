import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
} from "@/components/ui/form";

export const Route = createFileRoute(
	"/_authed/hackathons/$id/teams/new",
)({
	component: NewTeamPage,
});

const formSchema = z.object({
	name: z.string().min(2, "Team name must be at least 2 characters"),
	description: z.string().optional(),
	isOpen: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function NewTeamPage() {
	const { id } = Route.useParams();
	const hackathonId = id as Id<"hackathons">;
	const navigate = useNavigate();
	const createTeam = useMutation(api.teams.create);
	const updateTeam = useMutation(api.teams.update);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			description: "",
			isOpen: true,
		},
	});

	async function onSubmit(values: FormValues) {
		try {
			const teamId = await createTeam({
				hackathonId,
				name: values.name,
				description: values.description || undefined,
			});
			if (!values.isOpen) {
				await updateTeam({ id: teamId, isOpen: false });
			}
			toast.success("Team created!");
			navigate({
				to: "/hackathons/$id/teams/$teamId/manage",
				params: { id, teamId },
			});
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Failed to create team",
			);
		}
	}

	return (
		<div className="max-w-2xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">Create Team</h1>

			<Card>
				<CardHeader>
					<CardTitle>Team Details</CardTitle>
					<CardDescription>
						Create a new team for this hackathon. You will be the
						team leader.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-6"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Team Name</FormLabel>
										<FormControl>
											<Input
												placeholder="My Awesome Team"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Description (optional)
										</FormLabel>
										<FormControl>
											<Textarea
												placeholder="What is your team working on?"
												rows={3}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="isOpen"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between rounded-lg border p-4">
										<div className="space-y-0.5">
											<FormLabel className="text-base">
												Open Team
											</FormLabel>
											<FormDescription>
												Open teams can receive join
												requests from other
												participants.
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={
													field.onChange
												}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							<div className="flex gap-4">
								<Button
									type="submit"
									disabled={form.formState.isSubmitting}
								>
									{form.formState.isSubmitting
										? "Creating..."
										: "Create Team"}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										navigate({
											to: "/hackathons/$id/teams",
											params: { id },
										})
									}
								>
									Cancel
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
