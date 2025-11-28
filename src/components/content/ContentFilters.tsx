import type { Category, Persona, BrandVoice, ContentFilters } from "@/types/entities";

export interface ContentFiltersProps {
	categories: Pick<Category, "_id" | "name">[];
	personas: Pick<Persona, "_id" | "name">[];
	brandVoices: Pick<BrandVoice, "_id" | "name">[];
	filters: ContentFilters;
	onFiltersChange: (filters: ContentFilters) => void;
}

/**
 * Filter controls component for the content archive view.
 * Provides dropdowns for category, persona, brand voice, status, and date range filters.
 */
export function ContentFilters({
	categories,
	personas,
	brandVoices,
	filters,
	onFiltersChange,
}: ContentFiltersProps) {
	const hasActiveFilters = Object.keys(filters).length > 0;

	const handleCategoryChange = (value: string) => {
		const newFilters = { ...filters };
		if (value === "") {
			delete newFilters.categoryId;
		} else {
			newFilters.categoryId = value as any;
		}
		onFiltersChange(newFilters);
	};

	const handlePersonaChange = (value: string) => {
		const newFilters = { ...filters };
		if (value === "") {
			delete newFilters.personaId;
		} else {
			newFilters.personaId = value as any;
		}
		onFiltersChange(newFilters);
	};

	const handleBrandVoiceChange = (value: string) => {
		const newFilters = { ...filters };
		if (value === "") {
			delete newFilters.brandVoiceId;
		} else {
			newFilters.brandVoiceId = value as any;
		}
		onFiltersChange(newFilters);
	};

	const handleStatusChange = (value: string) => {
		const newFilters = { ...filters };
		if (value === "") {
			delete newFilters.status;
		} else {
			newFilters.status = value as "draft" | "finalized";
		}
		onFiltersChange(newFilters);
	};

	const handleDateFromChange = (value: string) => {
		const newFilters = { ...filters };
		if (value === "") {
			delete newFilters.dateFrom;
		} else {
			newFilters.dateFrom = new Date(value).getTime();
		}
		onFiltersChange(newFilters);
	};

	const handleDateToChange = (value: string) => {
		const newFilters = { ...filters };
		if (value === "") {
			delete newFilters.dateTo;
		} else {
			newFilters.dateTo = new Date(value).getTime();
		}
		onFiltersChange(newFilters);
	};

	const handleClearFilters = () => {
		onFiltersChange({});
	};

	const formatDateForInput = (timestamp: number) => {
		const date = new Date(timestamp);
		return date.toISOString().split("T")[0];
	};

	return (
		<div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
				{/* Category Filter */}
				<div>
					<label
						htmlFor="category-filter"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Category
					</label>
					<select
						id="category-filter"
						value={filters.categoryId || ""}
						onChange={(e) => handleCategoryChange(e.target.value)}
						className="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
					>
						<option value="">All Categories</option>
						{categories.map((category) => (
							<option key={category._id} value={category._id}>
								{category.name}
							</option>
						))}
					</select>
				</div>

				{/* Persona Filter */}
				<div>
					<label
						htmlFor="persona-filter"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Persona
					</label>
					<select
						id="persona-filter"
						value={filters.personaId || ""}
						onChange={(e) => handlePersonaChange(e.target.value)}
						className="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
					>
						<option value="">All Personas</option>
						{personas.map((persona) => (
							<option key={persona._id} value={persona._id}>
								{persona.name}
							</option>
						))}
					</select>
				</div>

				{/* Brand Voice Filter */}
				<div>
					<label
						htmlFor="brand-voice-filter"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Brand Voice
					</label>
					<select
						id="brand-voice-filter"
						value={filters.brandVoiceId || ""}
						onChange={(e) => handleBrandVoiceChange(e.target.value)}
						className="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
					>
						<option value="">All Brand Voices</option>
						{brandVoices.map((brandVoice) => (
							<option key={brandVoice._id} value={brandVoice._id}>
								{brandVoice.name}
							</option>
						))}
					</select>
				</div>

				{/* Status Filter */}
				<div>
					<label
						htmlFor="status-filter"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Status
					</label>
					<select
						id="status-filter"
						value={filters.status || ""}
						onChange={(e) => handleStatusChange(e.target.value)}
						className="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
					>
						<option value="">All Statuses</option>
						<option value="draft">Draft</option>
						<option value="finalized">Finalized</option>
					</select>
				</div>

				{/* Clear Filters Button */}
				<div className="flex items-end">
					<button
						type="button"
						onClick={handleClearFilters}
						disabled={!hasActiveFilters}
						className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Clear Filters
					</button>
				</div>
			</div>

			{/* Date Range Filters */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
				<div>
					<label
						htmlFor="date-from-filter"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Created From
					</label>
					<input
						type="date"
						id="date-from-filter"
						value={filters.dateFrom ? formatDateForInput(filters.dateFrom) : ""}
						onChange={(e) => handleDateFromChange(e.target.value)}
						className="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
					/>
				</div>
				<div>
					<label
						htmlFor="date-to-filter"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Created To
					</label>
					<input
						type="date"
						id="date-to-filter"
						value={filters.dateTo ? formatDateForInput(filters.dateTo) : ""}
						onChange={(e) => handleDateToChange(e.target.value)}
						className="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
					/>
				</div>
			</div>
		</div>
	);
}
