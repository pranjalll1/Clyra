'use server';

// Unit III: Forms and Server Actions
// Server Actions for server-side form handling, validation, data mutations, and cache revalidation
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Form validation schema (Unit III: Form Validation)
const ContactInquirySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid college email').endsWith('lpu.in', 'Must use an @lpu.in address'),
  category: z.string().min(1, 'Please select a topic'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

/**
 * Server Action: Handles event inquiry form submissions
 * Demonstrates: Server Actions, Form Validation, Error Handling, and Revalidation
 */
export async function submitContactInquiry(prevState, formData) {
  const rawData = {
    name: formData.get('name'),
    email: formData.get('email'),
    category: formData.get('category'),
    message: formData.get('message'),
  };

  const parsed = ContactInquirySchema.safeParse(rawData);

  if (!parsed.success) {
    // Return field-specific validation errors for client UI
    const errors = {};
    for (const issue of parsed.error.issues) {
      errors[issue.path[0]] = issue.message;
    }
    return { success: false, errors, data: rawData };
  }

  // Unit II & III: Mutate data or send email, then revalidate cache
  try {
    // Simulate inquiry submission / storage
    revalidatePath('/events');

    return {
      success: true,
      message: 'Thank you! Your inquiry has been submitted to the Clyra student team.',
      errors: {},
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to process inquiry. Please try again.',
      errors: {},
    };
  }
}

/**
 * Server Action: Explicitly revalidates events catalog cache
 * Demonstrates: Unit II Caching and Revalidation (revalidatePath)
 */
export async function revalidateEventsCatalog() {
  revalidatePath('/events');
  revalidatePath('/');
  return { revalidated: true, timestamp: Date.now() };
}
