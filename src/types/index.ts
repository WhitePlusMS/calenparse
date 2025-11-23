export interface Tag {
	id: string;
	name: string;
	color: string;
	createdAt: Date;
}

export interface CalendarEvent {
	id: string;
	title: string;
	startTime: Date;
	endTime: Date;
	isAllDay: boolean;
	location?: string;
	description?: string;
	originalText?: string;
	tagIds?: string[];
	isCompleted?: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface ParsedEvent {
	title?: string;
	startTime?: Date;
	endTime?: Date;
	isAllDay?: boolean;
	location?: string;
	description?: string;
	tags?: string[];
}

export interface LLMRequest {
	text: string;
}

export interface LLMResponse {
	events: ParsedEvent[];
	error?: string;
}

export interface SelectionState {
	isSelectionMode: boolean;
	selectedIds: Set<string>;
}
