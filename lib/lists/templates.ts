import { DSLSchema } from './dsl-types';

export const LIST_TEMPLATES: Record<string, DSLSchema> = {
  recipe: {
    name: 'Recipe',
    description: 'Organize your recipes with ingredients and cooking steps',
    fields: [
      {
        key: 'title',
        type: 'text',
        label: 'Recipe Name',
        required: true,
        displayOrder: 0,
      },
      {
        key: 'cuisine',
        type: 'select',
        label: 'Cuisine',
        options: ['Italian', 'Asian', 'Mexican', 'American', 'Other'],
        displayOrder: 1,
      },
      {
        key: 'difficulty',
        type: 'priority',
        label: 'Difficulty',
        displayOrder: 2,
      },
      {
        key: 'prep_time',
        type: 'number',
        label: 'Prep Time (minutes)',
        displayOrder: 3,
      },
      {
        key: 'cook_time',
        type: 'number',
        label: 'Cook Time (minutes)',
        displayOrder: 4,
      },
      {
        key: 'servings',
        type: 'number',
        label: 'Servings',
        displayOrder: 5,
      },
      {
        key: 'ingredients',
        type: 'textarea',
        label: 'Ingredients',
        required: true,
        placeholder: 'List ingredients with quantities',
        displayOrder: 6,
      },
      {
        key: 'steps',
        type: 'textarea',
        label: 'Cooking Steps',
        required: true,
        placeholder: 'Describe each cooking step',
        displayOrder: 7,
      },
      {
        key: 'notes',
        type: 'textarea',
        label: 'Notes',
        displayOrder: 8,
      },
      {
        key: 'source_url',
        type: 'url',
        label: 'Recipe Source',
        displayOrder: 9,
      },
    ],
  },
  music: {
    name: 'Music & Media Clips',
    description: 'Save and organize music clips, songs, and media',
    fields: [
      {
        key: 'title',
        type: 'text',
        label: 'Title',
        required: true,
        displayOrder: 0,
      },
      {
        key: 'artist',
        type: 'text',
        label: 'Artist',
        displayOrder: 1,
      },
      {
        key: 'type',
        type: 'select',
        label: 'Type',
        options: ['Song', 'Clip', 'Podcast', 'Video', 'Album'],
        displayOrder: 2,
      },
      {
        key: 'url',
        type: 'url',
        label: 'Link',
        displayOrder: 3,
      },
      {
        key: 'mood',
        type: 'select',
        label: 'Mood',
        options: ['Energetic', 'Calm', 'Melancholic', 'Upbeat', 'Focus'],
        displayOrder: 4,
      },
      {
        key: 'use_case',
        type: 'select',
        label: 'Use Case',
        options: ['Work', 'Choir', 'Personal', 'Performance'],
        displayOrder: 5,
      },
      {
        key: 'notes',
        type: 'textarea',
        label: 'Notes',
        displayOrder: 6,
      },
    ],
  },
  events: {
    name: 'Events & Concerts',
    description: 'Track events, concerts, and happenings',
    fields: [
      {
        key: 'name',
        type: 'text',
        label: 'Event Name',
        required: true,
        displayOrder: 0,
      },
      {
        key: 'date',
        type: 'date',
        label: 'Date',
        required: true,
        displayOrder: 1,
      },
      {
        key: 'time',
        type: 'text',
        label: 'Time',
        displayOrder: 2,
      },
      {
        key: 'location',
        type: 'text',
        label: 'Location',
        displayOrder: 3,
      },
      {
        key: 'category',
        type: 'select',
        label: 'Category',
        options: ['Concert', 'Class', 'Meetup', 'Sport', 'Workshop', 'Other'],
        displayOrder: 4,
      },
      {
        key: 'status',
        type: 'select',
        label: 'Status',
        options: ['Interested', 'Planning', 'Going', 'Attended'],
        displayOrder: 5,
      },
      {
        key: 'ticket_url',
        type: 'url',
        label: 'Ticket Link',
        displayOrder: 6,
      },
      {
        key: 'notes',
        type: 'textarea',
        label: 'Notes',
        displayOrder: 7,
      },
    ],
  },
  reading: {
    name: 'Reading & Inspiration',
    description: 'Save articles, books, and inspiring content',
    fields: [
      {
        key: 'title',
        type: 'text',
        label: 'Title',
        required: true,
        displayOrder: 0,
      },
      {
        key: 'author',
        type: 'text',
        label: 'Author',
        displayOrder: 1,
      },
      {
        key: 'type',
        type: 'select',
        label: 'Type',
        options: ['Article', 'Book', 'Video', 'Podcast', 'Post'],
        displayOrder: 2,
      },
      {
        key: 'url',
        type: 'url',
        label: 'Link',
        displayOrder: 3,
      },
      {
        key: 'category',
        type: 'select',
        label: 'Category',
        options: ['Recipe', 'Music', 'Creative', 'Tech', 'Personal', 'Work'],
        displayOrder: 4,
      },
      {
        key: 'status',
        type: 'select',
        label: 'Status',
        options: ['Saved', 'Reading', 'Done'],
        displayOrder: 5,
      },
      {
        key: 'notes',
        type: 'textarea',
        label: 'Notes',
        displayOrder: 6,
      },
    ],
  },
};

export function getTemplateList() {
  return Object.entries(LIST_TEMPLATES).map(([id, template]) => ({
    id,
    name: template.name,
    description: template.description,
    fieldCount: template.fields.length,
  }));
}
