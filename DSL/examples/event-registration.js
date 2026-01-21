/**
 * Event Registration DSL Example
 * 
 * An event registration form with attendee information,
 * ticket selection, and dietary preferences.
 */

const eventRegistrationSchema = {
  name: "Event Registration",
  description: "Collect event registration information from attendees",
  fields: [
    {
      key: "firstName",
      type: "text",
      label: "First Name",
      required: true,
      displayOrder: 1,
      placeholder: "John",
      validation: {
        minLength: 2,
        maxLength: 50
      }
    },
    {
      key: "lastName",
      type: "text",
      label: "Last Name",
      required: true,
      displayOrder: 2,
      placeholder: "Doe",
      validation: {
        minLength: 2,
        maxLength: 50
      }
    },
    {
      key: "email",
      type: "email",
      label: "Email Address",
      required: true,
      displayOrder: 3,
      placeholder: "attendee@example.com",
      helpText: "We'll send your ticket confirmation here"
    },
    {
      key: "phone",
      type: "tel",
      label: "Phone Number",
      required: true,
      displayOrder: 4,
      placeholder: "+1 (555) 123-4567"
    },
    {
      key: "ticketType",
      type: "select",
      label: "Ticket Type",
      required: true,
      displayOrder: 5,
      options: ["general", "vip", "student", "early-bird", "group"],
      helpText: "Select your preferred ticket type"
    },
    {
      key: "quantity",
      type: "number",
      label: "Number of Tickets",
      required: true,
      displayOrder: 6,
      defaultValue: 1,
      validation: {
        min: 1,
        max: 10,
        step: 1
      },
      visibility: {
        condition: {
          field: "ticketType",
          operator: "notEquals",
          value: "vip"
        }
      }
    },
    {
      key: "dietaryRestrictions",
      type: "multiselect",
      label: "Dietary Restrictions",
      displayOrder: 7,
      options: ["vegetarian", "vegan", "gluten-free", "dairy-free", "nut-allergy", "halal", "kosher"],
      helpText: "Select all that apply for catering purposes"
    },
    {
      key: "specialRequests",
      type: "textarea",
      label: "Special Requests or Accommodations",
      displayOrder: 8,
      placeholder: "Any special requirements or requests...",
      validation: {
        maxLength: 500
      },
      visibility: {
        condition: {
          field: "dietaryRestrictions",
          operator: "isNotEmpty",
          value: null
        }
      }
    },
    {
      key: "company",
      type: "text",
      label: "Company/Organization",
      displayOrder: 9,
      placeholder: "Optional company name"
    },
    {
      key: "jobTitle",
      type: "text",
      label: "Job Title",
      displayOrder: 10,
      placeholder: "Software Engineer",
      visibility: {
        condition: {
          field: "company",
          operator: "isNotEmpty",
          value: null
        }
      }
    },
    {
      key: "newsletter",
      type: "boolean",
      label: "Subscribe to Event Updates",
      displayOrder: 11,
      defaultValue: false,
      helpText: "Receive updates about future events"
    },
    {
      key: "registrationDate",
      type: "datetime",
      label: "Preferred Registration Time",
      displayOrder: 12,
      helpText: "When would you like to arrive? (optional)"
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = eventRegistrationSchema;
}
