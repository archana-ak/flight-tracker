import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const flights = await prisma.flight.findMany({
    where: { userId },
    orderBy: { startTime: "desc" },
  });

  const completedFlights = flights.filter((f) => f.duration !== null);
  const lifetimeMinutes = completedFlights.reduce((sum, f) => sum + (f.duration ?? 0), 0);
  const monthlyMinutes = completedFlights
    .filter((f) => f.startTime >= monthStart)
    .reduce((sum, f) => sum + (f.duration ?? 0), 0);

  return NextResponse.json({
    flights,
    stats: {
      monthlyMinutes,
      lifetimeMinutes,
      totalFlights: completedFlights.length,
    },
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const activeFlight = await prisma.flight.findFirst({
    where: { userId, endTime: null },
  });
  if (activeFlight) {
    return NextResponse.json({ error: "You already have an active flight" }, { status: 400 });
  }

  const flight = await prisma.flight.create({
    data: { userId, startTime: new Date() },
  });

  return NextResponse.json(flight);
}
