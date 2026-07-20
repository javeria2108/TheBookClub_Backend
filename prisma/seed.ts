import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");
  await prisma.book.createMany({
    data: [
      {
        title: "Atomic Habits",
        subtitle: "An Easy & Proven Way to Build Good Habits & Break Bad Ones",
        description:
          "A practical guide to habit formation and small behavioral improvements.",
        authors: ["James Clear"],
        coverImage:
          "https://books.google.com/books/content?id=fFCjDQAAQBAJ&printsec=frontcover&img=1&zoom=1",
        isbn10: "0735211299",
        isbn13: "9780735211292",
        publisher: "Avery",
        publishedDate: "2018-10-16",
        pageCount: 320,
        language: "en",
      },
      {
        title: "The Alchemist",
        description:
          "A philosophical novel about a shepherd's journey and personal legend.",
        authors: ["Paulo Coelho"],
        isbn10: "0062315005",
        isbn13: "9780062315007",
        publisher: "HarperOne",
        publishedDate: "2014",
        pageCount: 208,
        language: "en",
      },
      {
        title: "Pride and Prejudice",
        description:
          "A classic novel about manners, misunderstanding, and social expectations.",
        authors: ["Jane Austen"],
        isbn10: "0141439513",
        isbn13: "9780141439518",
        publisher: "Penguin Classics",
        publishedDate: "2002",
        pageCount: 480,
        language: "en",
      },
    ],
    skipDuplicates: true,
  });

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
