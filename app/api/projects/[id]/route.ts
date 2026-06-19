import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { FACTORY_ABI } from "@/lib/factory-abi";

const LAUNCH_ABI = [
  "function launches(address) view returns (address token, address bondingCurve, address creator, string tokenName, string tokenSymbol, uint256 totalSupply, uint256 basePrice, uint256 graduationCap, uint256 createdAt, bool exists)",
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.launchpadProject.findUnique({
      where: { id },
      include: {
        liquidityPool: true,
        launch: {
          select: {
            id: true,
            contractAddress: true,
            deployTxHash: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Auto-update status based on launchDate
    let statusUpdated = false;
    if (project.status === "upcoming" && new Date(project.launchDate) <= new Date()) {
      await prisma.launchpadProject.update({
        where: { id },
        data: { status: "active" },
      });
      project.status = "active";
      statusUpdated = true;
    }
    if (project.liquidityPool?.isGraduated && project.status !== "graduated") {
      await prisma.launchpadProject.update({
        where: { id },
        data: { status: "graduated" },
      });
      project.status = "graduated";
      statusUpdated = true;
    }

    // Get bonding curve address: pool → on-chain factory → null
    let bondingCurveAddress = project.liquidityPool?.poolAddress ?? null;

    if (!bondingCurveAddress && project.contractAddress) {
      // Fallback: query factory contract on-chain
      try {
        const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.ETH_RPC_URL;
        const factoryAddress = process.env.LAUNCHPAD_FACTORY_ADDRESS;
        if (rpcUrl && factoryAddress) {
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const factory = new ethers.Contract(factoryAddress, LAUNCH_ABI, provider);
          const info = await factory.launches(project.contractAddress);
          // Struct returns: token, bondingCurve, creator, tokenName, tokenSymbol, totalSupply, basePrice, graduationCap, createdAt, exists
          if (info[9]) { // exists
            bondingCurveAddress = info[1]; // bondingCurve
            // Update DB for future requests
            if (project.liquidityPool && bondingCurveAddress) {
              await prisma.liquidityPool.update({
                where: { id: project.liquidityPool.id },
                data: { poolAddress: bondingCurveAddress },
              }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch curve from factory:", err);
      }
    }

    const data = {
      ...project,
      bondingCurveAddress,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
