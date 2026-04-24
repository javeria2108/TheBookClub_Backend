import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

type ClubDefaults = {
  genre: string;
  coverImage: string;
};

const CLUB_DEFAULTS_BY_NAME: Record<string, ClubDefaults> = {
  "Sci-Fi Readers": {
    genre: "Science Fiction",
    coverImage:
      "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=900&q=80",
  },
  "Mystery & Thriller Club": {
    genre: "Mystery",
    coverImage:
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=900&q=80",
  },
  "Fantasy Fellowship": {
    genre: "Fantasy",
    coverImage:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=900&q=80",
  },
  "Non-Fiction Circle": {
    genre: "Non-Fiction",
    coverImage:
      "https://images.unsplash.com/photo-1455885666463-9c4b7fe58a8f?w=900&q=80",
  },
  "Islamic Books Circle": {
    genre: "Faith",
    coverImage:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=900&q=80",
  },
  "Self Help & Personal Growth": {
    genre: "Self Improvement",
    coverImage:
      "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=900&q=80",
  },
  "Private Classics Club": {
    genre: "Classics",
    coverImage:
      "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=900&q=80",
  },
};

const FALLBACK_COVER_IMAGES = [
  "https://images.unsplash.com/photo-1455885666463-9c4b7fe58a8f?w=900&q=80",
  "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=900&q=80",
  "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=900&q=80",
  "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=900&q=80",
  "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=900&q=80",
];

function inferGenre(clubName: string): string {
  const lower = clubName.toLowerCase();

  if (lower.includes("sci") || lower.includes("science fiction")) {
    return "Science Fiction";
  }

  if (lower.includes("mystery") || lower.includes("thriller")) {
    return "Mystery";
  }

  if (lower.includes("fantasy")) {
    return "Fantasy";
  }

  if (lower.includes("classic")) {
    return "Classics";
  }

  if (lower.includes("self help") || lower.includes("personal growth")) {
    return "Self Improvement";
  }

  if (lower.includes("islamic") || lower.includes("faith")) {
    return "Faith";
  }

  if (lower.includes("non-fiction") || lower.includes("non fiction")) {
    return "Non-Fiction";
  }

  return "General";
}

async function main() {
  console.log("🔧 Backfilling missing club metadata...");

  const clubsToBackfill = await prisma.bookClub.findMany({
    where: {
      OR: [{ genre: null }, { coverImage: null }],
    },
    orderBy: { createdAt: "asc" },
  });

  if (clubsToBackfill.length === 0) {
    console.log("✅ No clubs need backfill.");
    return;
  }

  let updatedCount = 0;

  for (let index = 0; index < clubsToBackfill.length; index += 1) {
    const club = clubsToBackfill[index];
    const namedDefaults = CLUB_DEFAULTS_BY_NAME[club.name];

    const nextGenre =
      club.genre ?? namedDefaults?.genre ?? inferGenre(club.name) ?? "General";

    const nextCoverImage =
      club.coverImage ??
      namedDefaults?.coverImage ??
      FALLBACK_COVER_IMAGES[index % FALLBACK_COVER_IMAGES.length];

    await prisma.bookClub.update({
      where: { id: club.id },
      data: {
        genre: nextGenre,
        coverImage: nextCoverImage,
      },
    });

    updatedCount += 1;
    console.log(`• Updated ${club.name}`);
  }

  console.log(`✅ Backfill complete. Updated ${updatedCount} club(s).`);
}

main()
  .catch((error) => {
    console.error("❌ Backfill error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
