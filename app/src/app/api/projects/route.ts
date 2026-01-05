import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ProjectPayload = {
  name: string;
  domain: string;
  tokenSymbol: string;
  totalSupply: number;
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

export async function GET() {
  const projects = await prisma.tokenProject.findMany({
    include: { distributionGroups: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ProjectPayload;
    if (!body.name || !body.domain || !body.tokenSymbol) {
      return NextResponse.json(
        { error: "name, domain, tokenSymbol are required" },
        { status: 400 }
      );
    }

    const groups = body.distributionGroups ?? [];
    const project = await prisma.tokenProject.create({
      data: {
        name: body.name,
        domain: body.domain,
        tokenSymbol: body.tokenSymbol,
        totalSupply: body.totalSupply ?? null,
        tgeDate: body.tgeDate ? new Date(body.tgeDate) : null,
        demandModel: body.demandModel ? JSON.stringify(body.demandModel) : null,
        marketCapModel: body.marketCapModel
          ? JSON.stringify(body.marketCapModel)
          : null,
        sellPressureModel: body.sellPressureModel
          ? JSON.stringify(body.sellPressureModel)
          : null,
        snapshotJson: body.snapshotJson
          ? JSON.stringify(body.snapshotJson)
          : null,
        distributionGroups: {
          create: groups.map((g) => ({
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
        },
      },
      include: { distributionGroups: true },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

