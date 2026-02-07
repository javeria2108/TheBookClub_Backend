import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
        name: "Private Classics Club",
        description: "Invite-only discussion of classic literature",
        isPublic: false,
      },
    ],
  });

  console.log("✅ Book clubs seeded");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
