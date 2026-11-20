export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
};

export const MAIN_GROUP_ORDER = [
  "klips",
  "soket",
  "jant-kapagi",
  "celik-jant-gobekleri",
  "oto-bakim-malzemeleri-kimyasallari",
] as const;

export function mainCategories(categories: CatalogCategory[]) {
  return categories
    .filter((category) => category.parent_id === null)
    .sort((a, b) => {
      const aRank = MAIN_GROUP_ORDER.indexOf(a.slug as typeof MAIN_GROUP_ORDER[number]);
      const bRank = MAIN_GROUP_ORDER.indexOf(b.slug as typeof MAIN_GROUP_ORDER[number]);
      const safeARank = aRank < 0 ? MAIN_GROUP_ORDER.length : aRank;
      const safeBRank = bRank < 0 ? MAIN_GROUP_ORDER.length : bRank;
      return safeARank - safeBRank || a.name.localeCompare(b.name, "tr");
    });
}

export function childCategories(categories: CatalogCategory[], parentId: string | undefined) {
  if (!parentId) return [];
  return categories
    .filter((category) => category.parent_id === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export function categoryGroup(categories: CatalogCategory[], category: CatalogCategory | null | undefined) {
  if (!category) return undefined;
  return category.parent_id
    ? categories.find((candidate) => candidate.id === category.parent_id)
    : category;
}

export function categoryLabel(category: CatalogCategory) {
  return category.slug === "camurluk" ? "Çamurluk / Davlumbaz Klipsleri" : category.name;
}

export function categoryPath(categories: CatalogCategory[], category: CatalogCategory | null | undefined) {
  if (!category) return "";
  const group = categoryGroup(categories, category);
  return group && group.id !== category.id
    ? `${group.name} › ${categoryLabel(category)}`
    : categoryLabel(category);
}
