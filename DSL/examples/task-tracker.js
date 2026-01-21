/**
 * Task Tracker DSL Example
 * 
 * A task management list with priorities, status tracking,
 * and assignment information.
 */

const taskTrackerSchema = {
  name: "Task Tracker",
  description: "Track tasks with priorities, status, and assignments",
  fields: [
    {
      key: "title",
      type: "text",
      label: "Task Title",
      required: true,
      displayOrder: 1,
      placeholder: "Complete project documentation",
      validation: {
        minLength: 5,
        maxLength: 200
      }
    },
    {
      key: "description",
      type: "textarea",
      label: "Task Description",
      displayOrder: 2,
      placeholder: "Detailed description of the task...",
      validation: {
        maxLength: 2000
      }
    },
    {
      key: "status",
      type: "select",
      label: "Status",
      required: true,
      displayOrder: 3,
      defaultValue: "todo",
      options: ["todo", "in-progress", "review", "done", "blocked"],
      helpText: "Current status of the task"
    },
    {
      key: "priority",
      type: "select",
      label: "Priority",
      required: true,
      displayOrder: 4,
      defaultValue: "medium",
      options: ["low", "medium", "high", "urgent"]
    },
    {
      key: "assignee",
      type: "text",
      label: "Assigned To",
      displayOrder: 5,
      placeholder: "team member name or email"
    },
    {
      key: "dueDate",
      type: "date",
      label: "Due Date",
      displayOrder: 6,
      helpText: "Target completion date"
    },
    {
      key: "estimatedHours",
      type: "number",
      label: "Estimated Hours",
      displayOrder: 7,
      validation: {
        min: 0.5,
        max: 1000,
        step: 0.5
      },
      helpText: "Estimated time to complete"
    },
    {
      key: "actualHours",
      type: "number",
      label: "Actual Hours",
      displayOrder: 8,
      validation: {
        min: 0,
        step: 0.5
      },
      visibility: {
        condition: {
          field: "status",
          operator: "equals",
          value: "done"
        }
      },
      helpText: "Time actually spent on the task"
    },
    {
      key: "tags",
      type: "multiselect",
      label: "Tags",
      displayOrder: 9,
      options: ["frontend", "backend", "design", "bug", "feature", "documentation", "testing"],
      helpText: "Categorize the task"
    },
    {
      key: "blockedReason",
      type: "textarea",
      label: "Blocked Reason",
      displayOrder: 10,
      placeholder: "Why is this task blocked?",
      visibility: {
        condition: {
          field: "status",
          operator: "equals",
          value: "blocked"
        }
      }
    },
    {
      key: "completedDate",
      type: "date",
      label: "Completed Date",
      displayOrder: 11,
      visibility: {
        condition: {
          field: "status",
          operator: "equals",
          value: "done"
        }
      }
    },
    {
      key: "isRecurring",
      type: "boolean",
      label: "Recurring Task",
      displayOrder: 12,
      defaultValue: false
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = taskTrackerSchema;
}
