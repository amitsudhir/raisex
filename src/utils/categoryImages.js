const CATEGORY_IMAGES = {
  "Charity": "/charity.jpg",
  "Education": "/education.jpg", 
  "Medical": "/medical.jpg",
  "Technology": "/technology.jpg",
  "Environment": "/environment.jpg",
  "Arts": "/arts.jpg",
  "Community": "/community.png",
  "Other": "/others.jpg"
};

/**
 * Get the appropriate image for a campaign
 * @param {string} imageURI - User uploaded image URI
 * @param {string} category - Campaign category
 * @returns {string} Image URL to use
 */
export const getCampaignImage = (imageURI, category) => {
  // If user has uploaded an image, use it
  if (imageURI && imageURI.trim() !== "") {
    return imageURI;
  }
  
  // Otherwise, use category-specific default image
  const categoryImage = CATEGORY_IMAGES[category];
  if (categoryImage) {
    return categoryImage;
  }
  
  // Fallback to "Other" category image if category not found
  return CATEGORY_IMAGES["Other"];
};

/**
 * Get all available category images
 * @returns {Object} Object with category names as keys and image paths as values
 */
export const getAllCategoryImages = () => {
  return { ...CATEGORY_IMAGES };
};

/**
 * Check if a category has a specific image
 * @param {string} category - Category name
 * @returns {boolean} True if category has a specific image
 */
export const hasCategoryImage = (category) => {
  return CATEGORY_IMAGES.hasOwnProperty(category);
};