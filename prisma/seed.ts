import { PrismaClient, QuestionType } from "@prisma/client";

const db = new PrismaClient();

const sections: {
  title: string;
  intro?: string;
  questions: { type: QuestionType; label: string; helpText?: string; requiresTargets?: boolean }[];
}[] = [
  {
    title: "Values Assessment",
    intro:
      "For each value, rate yourself and reflect honestly. Give specific examples from the period, then note the area you want to focus on next.",
    questions: [
      {
        type: "VALUE",
        label: "Value 1 - Results Focused",
        helpText:
          "Understands and meets client objectives. Thinks beyond the box. Applies pragmatic strategy. Delivers results.",
      },
      {
        type: "VALUE",
        label: "Value 2 - Dedicated to Excellence",
        helpText:
          "Always strives to be outstanding in everything they do. Holds high expectations of themselves and for clients. Delivers high quality work with strong attention to detail. Demonstrates personal integrity and commitment to self-improvement. Is proactive and consistent. Holds self and others accountable to values and standards. Pauses and reflects on learning opportunities.",
      },
      {
        type: "VALUE",
        label: "Value 3 - Outstanding Communicator",
        helpText:
          "Is proactive - doesn't wait to be asked. Is empathetic and respectful. Knows their audience and adapts accordingly. Keeps people informed throughout. Does what they say they will do.",
      },
      {
        type: "VALUE",
        label: "Value 4 - Gets It Done",
        helpText:
          "Makes it happen - on time, on budget and on scope. Goes the extra mile. Is positive and hardworking. Is driven and self-motivated. Moves things forward - outcomes are essential.",
      },
      {
        type: "VALUE",
        label: "Value 5 - Deliver Innovation",
        helpText:
          "Proactively looks for better ways to do things. Embraces innovation. Develops fast and more efficient methods. Has an early adopter mindset. Adapts to change. Is comfortable being uncomfortable.",
      },
      {
        type: "VALUE",
        label: "Value 6 - Celebrate the Wins",
        helpText:
          "Acknowledges the wins of colleagues. Treats a client win as an A-Team win. Embraces, commits to and celebrates Norling Law's wins. Approaches setbacks with a learning mindset - we win or we learn. Recognises that big or small, a win is a win.",
      },
    ],
  },
  {
    title: "Development & Forward Focus",
    questions: [
      { type: "LONGTEXT", label: "What are you most proud of this period?" },
      {
        type: "LONGTEXT",
        label: "Biggest challenge and what you have taken from it",
      },
      {
        type: "LONGTEXT",
        label: "Where do you want to grow in the next 12 months?",
      },
      { type: "LONGTEXT", label: "Where do you see yourself in 3 years and beyond?" },
      {
        type: "LONGTEXT",
        label:
          "What else do you need from your supervisor or Director to help you get there?",
      },
    ],
  },
];

async function main() {
  const existing = await db.section.count();
  if (existing > 0) {
    console.log("Questions already seeded - skipping.");
    return;
  }
  let s = 0;
  for (const sec of sections) {
    s += 1;
    const created = await db.section.create({
      data: { title: sec.title, intro: sec.intro, order: s },
    });
    let q = 0;
    for (const question of sec.questions) {
      q += 1;
      await db.question.create({
        data: {
          sectionId: created.id,
          order: q,
          type: question.type,
          label: question.label,
          helpText: question.helpText,
          requiresTargets: question.requiresTargets ?? false,
        },
      });
    }
  }
  console.log("Seeded sections and questions.");
}

main().finally(() => db.$disconnect());
