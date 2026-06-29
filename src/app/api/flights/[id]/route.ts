import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as { id: string }).id;
  const body = await request.json();

  const flight = await prisma.flight.findFirst({
    where: { id, userId },
  });
  if (!flight) {
    return NextResponse.json({ error: "Flight not found" }, { status: 404 });
  }
  if (flight.endTime) {
    return NextResponse.json({ error: "Flight already ended" }, { status: 400 });
  }

  const endTime = new Date();
  const duration = Math.round((endTime.getTime() - flight.startTime.getTime()) / 60000);

  const updated = await prisma.flight.update({
    where: { id },
    data: {
      endTime,
      duration,
      note: body.note || null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  const flight = await prisma.flight.findFirst({
    where: { id, userId },
  });
  if (!flight) {
    return NextResponse.json({ error: "Flight not found" }, { status: 404 });
  }

  await prisma.flight.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
