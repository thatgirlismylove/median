

// 初始化 Prisma Client
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 创建2个虚拟文章
  const post1 = await prisma.article.create({
    data: {
      title: 'Prisma Adds Support for MongoDB',
      body: 'Support for MongoDB has been one of the most requested features since the initial release of...',
      description:
        "We are excited to share that today's Prisma ORM release adds stable support for MongoDB!",
      published: false,
    },
  });

  // upsert：用于创建或更新，确保在满足 where 条件时更新，否则创建新记录。
  const post2 = await prisma.article.upsert({
    where: {
      title: "What's new in Prisma ? (Q1 / 22)",
    },
    update: {},
    create: {
      title: "What's new in Prisma? (Q1/22)",
      body: 'Our engineers have been working hard, issuing new releases with many improvements...',
      description:
        'Learn about everything in the Prisma ecosystem and community from January to March 2022.',
      published: true,
    },
  });
  console.log(post1, post2);
}

// 执行 main 函数
main()
  .catch((e) => {
    console.log(e);
    // 非正常退出进程，不会执行后续任何代码
    process.exit(1);
  })
  .finally(async () => {
    // 关闭 Prisma Client
    await prisma.$disconnect();
  });
