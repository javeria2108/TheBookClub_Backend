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
      },
      {
        name: "Mystery & Thriller Club",
        description: "Whodunits, thrillers, and crime novels",
        isPublic: true,
      },
      {
        name: "Fantasy Fellowship",
        description: "Epic fantasy worlds and adventures",
        isPublic: true,
      },
      {
        name: "Non-Fiction Circle",
        description: "Biographies, history, and self-growth",
        isPublic: true,
      },
      {
        name: "Islamic Books Circle",
        description:
          "Discussion of Quran, Hadith, Seerah, and Islamic scholarship",
        isPublic: true,
      },
      {
        name: "Self Help & Personal Growth",
        description:
          "Books on productivity, mindset, habits, and self improvement",
        isPublic: true,
      },
      {
        name: "Private Classics Club",
        description: "Invite-only discussion of classic literature",
        isPublic: false,
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
