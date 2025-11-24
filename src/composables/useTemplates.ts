import { computed } from "vue";
import { useEvents } from "./useEvents";
import type { CalendarEvent } from "@/types";

/**
 * Templates management composable
 * Provides template-specific operations by reusing useEvents functionality
 *
 * Templates are stored as CalendarEvent records with isTemplate=true
 * This design allows:
 * - Code reuse (all CRUD operations from useEvents)
 * - Shared data structure and validation
 * - Simplified database schema (single events table)
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 11.4
 */
export function useTemplates() {
	const { events, createEvent, updateEvent, deleteEvent, loading, error } = useEvents();

	/**
	 * Computed property: Filter all templates from events
	 * Requirement 9.4: Display all saved templates
	 * Automatically reactive to changes in events
	 */
	const templates = computed(() => events.value.filter((e) => e.isTemplate === true));

	/**
	 * Create a template from an existing event
	 * Requirement 9.1: Provide "save as template" option
	 * Requirement 9.2: Prompt for template name and save configuration (excluding specific date/time)
	 *
	 * @param event - The event to convert to a template
	 * @param templateName - Name for the template
	 * @returns The created template
	 */
	const createTemplateFromEvent = async (event: CalendarEvent, templateName: string): Promise<CalendarEvent> => {
		// Copy event data and mark as template
		const template: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt"> = {
			...event,
			isTemplate: true,
			templateName,
			isCompleted: false, // Templates don't need completion status
			originalText: undefined, // Templates don't need original text
		};

		return await createEvent(template);
	};

	/**
	 * Create an event from a template
	 * Requirement 10.1: Open event creation dialog with all template fields pre-filled
	 * Requirement 10.2: Require user to specify date and time
	 * Requirement 10.3: Create new event and save to database
	 *
	 * @param template - The template to use
	 * @param startTime - Start time for the new event
	 * @returns The created event
	 */
	const createEventFromTemplate = async (template: CalendarEvent, startTime: Date): Promise<CalendarEvent> => {
		// Calculate duration from template
		const duration = template.endTime.getTime() - template.startTime.getTime();
		const endTime = new Date(startTime.getTime() + duration);

		// Copy template data and mark as regular event
		const event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt"> = {
			...template,
			startTime,
			endTime,
			isTemplate: false,
			templateName: undefined,
		};

		return await createEvent(event);
	};

	/**
	 * Update a template
	 * Requirement 11.2: Allow modifying all template fields and save changes
	 *
	 * @param id - Template ID
	 * @param updates - Fields to update
	 * @returns The updated template
	 */
	const updateTemplate = async (id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> => {
		// Ensure isTemplate remains true
		return await updateEvent(id, { ...updates, isTemplate: true });
	};

	/**
	 * Delete a template
	 * Requirement 11.3: Remove template from database
	 * Requirement 11.4: Do not affect events created from the template
	 *
	 * @param id - Template ID
	 */
	const deleteTemplate = async (id: string): Promise<void> => {
		return await deleteEvent(id);
	};

	/**
	 * Convert an existing event to a template
	 * Requirement 9.1: Alternative way to create templates
	 *
	 * @param eventId - Event ID to convert
	 * @param templateName - Name for the template
	 * @returns The converted template
	 */
	const convertEventToTemplate = async (eventId: string, templateName: string): Promise<CalendarEvent> => {
		return await updateEvent(eventId, {
			isTemplate: true,
			templateName,
		});
	};

	/**
	 * Convert a template to an event
	 * Requirement 10.1: Alternative way to use templates
	 *
	 * @param templateId - Template ID to convert
	 * @param startTime - Start time for the event
	 * @returns The converted event
	 */
	const convertTemplateToEvent = async (templateId: string, startTime: Date): Promise<CalendarEvent> => {
		const template = events.value.find((e) => e.id === templateId);
		if (!template) {
			throw new Error("模板不存在");
		}

		// Calculate duration from template
		const duration = template.endTime.getTime() - template.startTime.getTime();
		const endTime = new Date(startTime.getTime() + duration);

		return await updateEvent(templateId, {
			startTime,
			endTime,
			isTemplate: false,
			templateName: undefined,
		});
	};

	/**
	 * Get a template by ID
	 *
	 * @param id - Template ID
	 * @returns The template or undefined if not found
	 */
	const getTemplateById = (id: string): CalendarEvent | undefined => {
		return templates.value.find((t) => t.id === id);
	};

	/**
	 * Get a template by name
	 *
	 * @param name - Template name
	 * @returns The template or undefined if not found
	 */
	const getTemplateByName = (name: string): CalendarEvent | undefined => {
		return templates.value.find((t) => t.templateName === name);
	};

	return {
		// State (computed)
		templates,
		loading,
		error,

		// Methods
		createTemplateFromEvent,
		createEventFromTemplate,
		updateTemplate,
		deleteTemplate,
		convertEventToTemplate,
		convertTemplateToEvent,
		getTemplateById,
		getTemplateByName,
	};
}
