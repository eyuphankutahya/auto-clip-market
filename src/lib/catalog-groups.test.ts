import { describe, expect, it } from "vitest";
import { categoryGroup, categoryPath, childCategories, mainCategories, type CatalogCategory } from "@/lib/catalog-groups";

const groups: CatalogCategory[] = [
  { id: "care", name: "Oto Bakım Malzemeleri ve Kimyasalları", slug: "oto-bakim-malzemeleri-kimyasallari", parent_id: null },
  { id: "clips", name: "KLİPS", slug: "klips", parent_id: null },
  { id: "socket", name: "Soket", slug: "soket", parent_id: null },
  { id: "rim", name: "Jant Kapağı", slug: "jant-kapagi", parent_id: null },
  { id: "steel", name: "Çelik Jant Göbekleri", slug: "celik-jant-gobekleri", parent_id: null },
  { id: "bumper", name: "Tampon Klipsleri", slug: "tampon", parent_id: "clips" },
  { id: "mudguard", name: "Çamurluk Klipsleri", slug: "camurluk", parent_id: "clips" },
];

describe("catalog category hierarchy", () => {
  it("shows the five requested main groups in business order", () => {
    expect(mainCategories(groups).map((group) => group.slug)).toEqual([
      "klips", "soket", "jant-kapagi", "celik-jant-gobekleri", "oto-bakim-malzemeleri-kimyasallari",
    ]);
  });

  it("keeps existing clip types below KLİPS and resolves their main group", () => {
    expect(childCategories(groups, "clips").map((category) => category.slug)).toEqual(["camurluk", "tampon"]);
    expect(categoryGroup(groups, groups[6])?.slug).toBe("klips");
  });

  it("renders the main group and subcategory as a product path", () => {
    expect(categoryPath(groups, groups[6])).toBe("KLİPS › Çamurluk / Davlumbaz Klipsleri");
    expect(categoryPath(groups, groups[2])).toBe("Soket");
  });
});
