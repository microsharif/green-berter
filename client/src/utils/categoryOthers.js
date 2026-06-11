/** Level-1 "Others" bucket — uses a free-text note instead of subcategory. */
export function isOthersParentCategory(category) {
  return category?.level === 1 && category?.name === "Others";
}

export function isOthersCategoryPath(categoryPath) {
  return isOthersParentCategory(categoryPath?.[0]);
}
