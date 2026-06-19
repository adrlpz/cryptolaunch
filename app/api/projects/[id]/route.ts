import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { FACTORY_ABI } from "@/lib/factory-abi";

const LAUNCH_ABI = [
  "function launches(address) view returns (bool exists, address creator, string tokenName, string tokenSymbol, address bondingCurve, uint256 totalSupply, uint256 basePrice, uint256 graduationCap)",
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
          if (info.exists) {
            bondingCurveAddress = info.bondingCurve;
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
