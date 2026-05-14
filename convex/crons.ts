import { cronJobs, makeFunctionReference } from "convex/server";

const crons = cronJobs();

// Use makeFunctionReference here so we don't pull the full generated
// `internal` type tree into this file (it hits TS's recursion limit
// once the project grows past a few modules).
crons.cron(
	"source-ticker",
	"* * * * *",
	makeFunctionReference<"mutation">("sources:tick"),
	{},
);

export default crons;
