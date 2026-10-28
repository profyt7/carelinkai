// Ensure Prisma connection pool is closed so Jest can exit cleanly
module.exports = async () => {
  try {
    const prisma = globalThis.prisma;
    if (prisma && typeof prisma.$disconnect === 'function') {
      await prisma.$disconnect();
    }
  } catch (e) {
    // ignore
  }
};
