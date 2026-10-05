export type CatalogService = {
  id: number;
  title: string;
  category: string;
  description: string;
  price: number;
  duration: string;
  delivery: "رقمي" | "حضوري" | "رقمي وحضوري";
  provider: "تنفيذ آلي" | "مقدم خدمة" | "مختص أكاديمي";
  templateGroup: "تقارير" | "عروض" | "تصاميم" | "سيرة مهنية" | "وثائق" | "تقنية" | null;
  variants: string[];
};

export const catalogServices: CatalogService[] = [];
export const catalogCategories: { name: string; count: number }[] = [];