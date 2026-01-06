import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ProjectPayload = {
  name?: string;
  domain?: string;
  tokenSymbol?: string;
  totalSupply?: number;
  tgeDate?: string | null;
  distributionGroups?: Array<{
    name: string;
    allocationPct: number;
    type: string;
    category: string;
    notes?: string;
    tgeUnlockPct?: number;
    cliffMonths?: number;
    vestMonths?: number;
    unlockFrequency?: string;
    startMonth?: number;
    sellPreset?: string | null;
    costBasisUsd?: number | null;
    impliedFdvAtTge?: number | null;
    sellPctOfUnlocked?: number | null;
    includeInSellPressure?: boolean;
    metadata?: Record<string, unknown>;
  }>;
  demandModel?: Record<string, unknown>;
  marketCapModel?: Record<string, unknown>;
  sellPressureModel?: Record<string, unknown>;
  snapshotJson?: Record<string, unknown>;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.tokenProject.findUnique({
    where: { id },
    include: { distributionGroups: true, comparisonSnapshots: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as ProjectPayload;
    const existing = await prisma.tokenProject.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      name: body.name ?? existing.name,
      domain: body.domain ?? existing.domain,
      tokenSymbol: body.tokenSymbol ?? existing.tokenSymbol,
      totalSupply:
        body.totalSupply === undefined ? existing.totalSupply : body.totalSupply,
      tgeDate:
        body.tgeDate === undefined
          ? existing.tgeDate
          : body.tgeDate
          ? new Date(body.tgeDate)
          : null,
      demandModel:
        body.demandModel === undefined
          ? existing.demandModel
          : body.demandModel
          ? JSON.stringify(body.demandModel)
          : null,
      marketCapModel:
        body.marketCapModel === undefined
          ? existing.marketCapModel
          : body.marketCapModel
          ? JSON.stringify(body.marketCapModel)
          : null,
      sellPressureModel:
        body.sellPressureModel === undefined
          ? existing.sellPressureModel
          : body.sellPressureModel
          ? JSON.stringify(body.sellPressureModel)
          : null,
      snapshotJson:
        body.snapshotJson === undefined
          ? existing.snapshotJson
          : body.snapshotJson
          ? JSON.stringify(body.snapshotJson)
          : null,
    };

    const groups = body.distributionGroups;
    const project = await prisma.$transaction(async (tx) => {
      const updated = await tx.tokenProject.update({
        where: { id },
        data: updateData,
      });

      if (groups) {
        await tx.distributionGroup.deleteMany({ where: { projectId: id } });
        await tx.distributionGroup.createMany({
          data: groups.map((g) => ({
            projectId: id,
            name: g.name,
            allocationPct: g.allocationPct,
            type: g.type,
            category: g.category,
            notes: g.notes,
            tgeUnlockPct: g.tgeUnlockPct ?? 0,
            cliffMonths: g.cliffMonths ?? 0,
            vestMonths: g.vestMonths ?? 0,
            unlockFrequency: g.unlockFrequency ?? "MONTHLY",
            startMonth: g.startMonth ?? 0,
            sellPreset: g.sellPreset ?? null,
            costBasisUsd: g.costBasisUsd ?? null,
            impliedFdvAtTge: g.impliedFdvAtTge ?? null,
            sellPctOfUnlocked: g.sellPctOfUnlocked ?? null,
            includeInSellPressure:
              g.includeInSellPressure === false ? false : true,
            metadata: g.metadata ? JSON.stringify(g.metadata) : null,
          })),
        });
      }

      return updated;
    });

    const withRelations = await prisma.tokenProject.findUnique({
      where: { id },
      include: { distributionGroups: true, comparisonSnapshots: true },
    });

    return NextResponse.json(withRelations ?? project);
  } catch (error) {
    console.error("PUT /api/projects/[id] error", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.tokenProject.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}

