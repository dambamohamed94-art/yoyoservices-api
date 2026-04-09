import "dotenv/config";
import { PrismaClient, ProductStockStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

const categoriesData = [
  {
    name: "Produits laitiers",
    slug: "produits-laitiers",
    imageUrl: "/categories/produits-laitiers.jpg",
    backgroundColor: "#F5F5DC",
    displayOrder: 1,
    isActive: true,
  },
  {
    name: "Boulangerie",
    slug: "boulangerie",
    imageUrl: "/categories/boulangerie.jpg",
    backgroundColor: "#FDEBD0",
    displayOrder: 2,
    isActive: true,
  },
  {
    name: "Produits secs",
    slug: "produits-secs",
    imageUrl: "/categories/produits-secs.jpg",
    backgroundColor: "#FCF3CF",
    displayOrder: 3,
    isActive: true,
  },
  {
    name: "Viande & poisson",
    slug: "viande-poisson",
    imageUrl: "/categories/viande-poisson.jpg",
    backgroundColor: "#FADBD8",
    displayOrder: 4,
    isActive: true,
  },
  {
    name: "Légumes & fruits",
    slug: "legumes-fruits",
    imageUrl: "/categories/legumes-fruits.jpg",
    backgroundColor: "#D5F5E3",
    displayOrder: 5,
    isActive: true,
  },
  {
    name: "Boissons",
    slug: "boissons",
    imageUrl: "/categories/boissons.jpg",
    backgroundColor: "#D6EAF8",
    displayOrder: 6,
    isActive: true,
  },
  {
    name: "Produits surgelés",
    slug: "produits-surgeles",
    imageUrl: "/categories/produits-surgeles.jpg",
    backgroundColor: "#E8DAEF",
    displayOrder: 7,
    isActive: true,
  },
  {
    name: "Hygiène & beauté",
    slug: "hygiene-beaute",
    imageUrl: "/categories/hygiene-beaute.jpg",
    backgroundColor: "#FDEDEC",
    displayOrder: 8,
    isActive: true,
  },
];

const productsData = [
  {
    name: "Lait",
    slug: "lait",
    description: "Lait frais pour la consommation quotidienne.",
    price: 1800,
    quantity: 12,
    stockStatus: ProductStockStatus.IN_STOCK,
    imageUrl: "/products/lait.jpg",
    isActive: true,
    isFeatured: true,
    categorySlug: "produits-laitiers",
  },
  {
    name: "Œufs",
    slug: "oeufs",
    description: "Œufs frais sélectionnés.",
    price: 2500,
    quantity: 10,
    stockStatus: ProductStockStatus.IN_STOCK,
    imageUrl: "/products/oeufs.jpg",
    isActive: true,
    isFeatured: false,
    categorySlug: "produits-laitiers",
  },
  {
    name: "Pain",
    slug: "pain",
    description: "Pain frais du jour.",
    price: 500,
    quantity: 15,
    stockStatus: ProductStockStatus.IN_STOCK,
    imageUrl: "/products/pain.jpg",
    isActive: true,
    isFeatured: true,
    categorySlug: "boulangerie",
  },
  {
    name: "Riz",
    slug: "riz",
    description: "Riz de qualité pour toute la famille.",
    price: 4500,
    quantity: 20,
    stockStatus: ProductStockStatus.IN_STOCK,
    imageUrl: "/products/riz.jpg",
    isActive: true,
    isFeatured: true,
    categorySlug: "produits-secs",
  },
  {
    name: "Pâtes",
    slug: "pates",
    description: "Pâtes alimentaires pratiques et rapides.",
    price: 1200,
    quantity: 14,
    stockStatus: ProductStockStatus.IN_STOCK,
    imageUrl: "/products/pates.jpg",
    isActive: true,
    isFeatured: false,
    categorySlug: "produits-secs",
  },
  {
    name: "Poulet",
    slug: "poulet",
    description: "Poulet frais prêt à cuisiner.",
    price: 6500,
    quantity: 8,
    stockStatus: ProductStockStatus.IN_STOCK,
    imageUrl: "/products/poulet.jpg",
    isActive: true,
    isFeatured: true,
    categorySlug: "viande-poisson",
  },
  {
    name: "Pommes",
    slug: "pommes",
    description: "Pommes fraîches sélectionnées.",
    price: 2200,
    quantity: 9,
    stockStatus: ProductStockStatus.IN_STOCK,
    imageUrl: "/products/pommes.jpg",
    isActive: true,
    isFeatured: false,
    categorySlug: "legumes-fruits",
  },
  {
    name: "Eau minérale",
    slug: "eau-minerale",
    description: "Eau minérale en bouteille.",
    price: 800,
    quantity: 25,
    stockStatus: ProductStockStatus.IN_STOCK,
    imageUrl: "/products/eau-minerale.jpg",
    isActive: true,
    isFeatured: false,
    categorySlug: "boissons",
  },
  {
    name: "Jus d’orange",
    slug: "jus-orange",
    description: "Jus d’orange rafraîchissant.",
    price: 1500,
    quantity: 12,
    stockStatus: ProductStockStatus.IN_STOCK,
    imageUrl: "/products/jus-orange.jpg",
    isActive: true,
    isFeatured: true,
    categorySlug: "boissons",
  },
  {
    name: "Soda",
    slug: "soda",
    description: "Boisson gazeuse fraîche.",
    price: 1000,
    quantity: 18,
    stockStatus: ProductStockStatus.IN_STOCK,
    imageUrl: "/products/soda.jpg",
    isActive: true,
    isFeatured: false,
    categorySlug: "boissons",
  },
];

async function main() {
  console.log("Seeding database...");

  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  for (const category of categoriesData) {
    const created = await prisma.category.create({
      data: category,
    });
    console.log("Created category:", created.slug);
  }

  const allCategories = await prisma.category.findMany();
  console.log("CATEGORIES COUNT:", allCategories.length);

 
 
 
for (const product of productsData) {
  console.log("Looking for category:", product.categorySlug);

  const category = await prisma.category.findUnique({
    where: { slug: product.categorySlug },
  });

  if (!category) {
    console.warn(`Category not found for slug: ${product.categorySlug}`);
    continue;
  }

  await prisma.product.create({
    data: {
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      stockStatus: product.stockStatus,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      categoryId: category.id,
    },
  });

  console.log("Created product:", product.slug);
}

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });