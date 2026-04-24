import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");
  await prisma.bookClub.createMany({
    data: [
      {
        name: "Sci-Fi Readers",
        description: "Exploring classic and modern science fiction",
        isPublic: true,
        genre: "Science Fiction",
        coverImage:
          "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=900&q=80",
      },
      {
        name: "Mystery & Thriller Club",
        description: "Whodunits, thrillers, and crime novels",
        isPublic: true,
        genre: "Mystery",
        coverImage:
          "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=900&q=80",
      },
      {
        name: "Fantasy Fellowship",
        description: "Epic fantasy worlds and adventures",
        isPublic: true,
        genre: "Fantasy",
        coverImage:
          "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=900&q=80",
      },
      {
        name: "Non-Fiction Circle",
        description: "Biographies, history, and self-growth",
        isPublic: true,
        genre: "Non-Fiction",
        coverImage:
          "https://images.unsplash.com/photo-1455885666463-9c4b7fe58a8f?w=900&q=80",
      },
      {
        name: "Islamic Books Circle",
        description:
          "Discussion of Quran, Hadith, Seerah, and Islamic scholarship",
        isPublic: true,
        genre: "Faith",
        coverImage:
          "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=900&q=80",
      },
      {
        name: "Self Help & Personal Growth",
        description:
          "Books on productivity, mindset, habits, and self improvement",
        isPublic: true,
        genre: "Self Improvement",
        coverImage:
          "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=900&q=80",
      },
      {
        name: "Private Classics Club",
        description: "Invite-only discussion of classic literature",
        isPublic: false,
        genre: "Classics",
        coverImage:
          "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=900&q=80",
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Book clubs seeded successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
