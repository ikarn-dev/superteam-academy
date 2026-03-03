/**
 * GET /api/leaderboard/stats — Global platform statistics.
 * Total XP includes both on-chain (from snapshots) and off-chain (from profiles).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/backend/prisma';
import { checkRateLimit } from '@/backend/auth/rate-limit';
import { getClientIp } from '@/backend/auth/ip';
import type { LeaderboardStats } from '@/context/types/leaderboard';

export async function GET(request: NextRequest) {
    try {
        const ip = getClientIp(request);
        const { success, response } = await checkRateLimit(`leaderboard-stats:${ip}`, 'lenient');
        if (!success) return response as NextResponse;

        const [totalUsers, totalCompletions, offchainAgg, latestSnapshots] = await Promise.all([
            prisma.profiles.count({
                where: { deleted_at: null },
            }),
            prisma.streak_activity.aggregate({
                _sum: { courses_completed: true },
            }),
            // Sum all off-chain XP
            prisma.profiles.aggregate({
                _sum: { offchain_xp: true },
                where: { deleted_at: null },
            }),
            // Get latest on-chain XP snapshots
            prisma.xp_snapshots.findMany({
                orderBy: { snapped_at: 'desc' },
                distinct: ['wallet'],
                select: { xp_balance: true },
            }),
        ]);

        // Sum on-chain XP from snapshots
        const onchainTotal = latestSnapshots.reduce(
            (sum: number, s: { xp_balance: bigint }) => sum + Number(s.xp_balance), 0
        );
        const offchainTotal = offchainAgg._sum.offchain_xp ?? 0;

        const stats: LeaderboardStats = {
            totalUsers,
            totalXp: onchainTotal + offchainTotal,
            totalCompletions: totalCompletions._sum.courses_completed ?? 0,
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('[Leaderboard] Error fetching stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
