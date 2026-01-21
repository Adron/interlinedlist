/**
 * Employee Directory DSL Example
 * 
 * An employee directory with contact information, department,
 * and employment details.
 */

const employeeDirectorySchema = {
  name: "Employee Directory",
  description: "Maintain employee information and contact details",
  fields: [
    {
      key: "employeeId",
      type: "text",
      label: "Employee ID",
      required: true,
      displayOrder: 1,
      placeholder: "EMP-001",
      validation: {
        pattern: "^EMP-[0-9]+$",
        minLength: 5,
        maxLength: 20
      },
      helpText: "Unique employee identifier"
    },
    {
      key: "firstName",
      type: "text",
      label: "First Name",
      required: true,
      displayOrder: 2,
      placeholder: "Jane",
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
      displayOrder: 3,
      placeholder: "Smith",
      validation: {
        minLength: 2,
        maxLength: 50
      }
    },
    {
      key: "email",
      type: "email",
      label: "Work Email",
      required: true,
      displayOrder: 4,
      placeholder: "jane.smith@company.com"
    },
    {
      key: "phone",
      type: "tel",
      label: "Phone Extension",
      displayOrder: 5,
      placeholder: "x1234"
    },
    {
      key: "department",
      type: "select",
      label: "Department",
      required: true,
      displayOrder: 6,
      options: ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations", "Support"]
    },
    {
      key: "jobTitle",
      type: "text",
      label: "Job Title",
      required: true,
      displayOrder: 7,
      placeholder: "Senior Software Engineer"
    },
    {
      key: "manager",
      type: "text",
      label: "Manager",
      displayOrder: 8,
      placeholder: "Manager name or email"
    },
    {
      key: "hireDate",
      type: "date",
      label: "Hire Date",
      required: true,
      displayOrder: 9
    },
    {
      key: "employmentType",
      type: "select",
      label: "Employment Type",
      required: true,
      displayOrder: 10,
      defaultValue: "full-time",
      options: ["full-time", "part-time", "contract", "intern"]
    },
    {
      key: "location",
      type: "text",
      label: "Office Location",
      displayOrder: 11,
      placeholder: "New York, NY"
    },
    {
      key: "skills",
      type: "multiselect",
      label: "Skills",
      displayOrder: 12,
      options: ["JavaScript", "Python", "React", "Node.js", "SQL", "AWS", "Docker", "Kubernetes", "TypeScript"],
      helpText: "Select relevant technical skills"
    },
    {
      key: "bio",
      type: "textarea",
      label: "Bio",
      displayOrder: 13,
      placeholder: "Brief professional bio...",
      validation: {
        maxLength: 500
      }
    },
    {
      key: "isActive",
      type: "boolean",
      label: "Active Employee",
      displayOrder: 14,
      defaultValue: true
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = employeeDirectorySchema;
}
