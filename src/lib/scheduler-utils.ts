/**
 * Utility functions for the online scheduler
 */

/**
 * Extracts company ID from URL slug
 * The slug format is: [company-name]-[company-id]
 * Company ID is the last 24 characters (MongoDB ObjectId)
 * 
 * @param slug - The URL slug (e.g., "acme-company-507f1f77bcf86cd799439011")
 * @returns The company ID if valid, null otherwise
 */
export function extractCompanyIdFromSlug(slug: string): string | null {
  if (!slug || typeof slug !== 'string') {
    return null;
  }

  // Extract last 24 characters as ObjectId
  const objectIdLength = 24;
  if (slug.length < objectIdLength) {
    return null;
  }

  const companyId = slug.slice(-objectIdLength);
  
  // Validate ObjectId format (24 hex characters)
  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(companyId);
  
  return isValidObjectId ? companyId : null;
}

/**
 * Validates if a string is a valid MongoDB ObjectId
 * 
 * @param str - String to validate
 * @returns true if valid ObjectId, false otherwise
 */
export function isValidObjectId(str: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(str);
}

