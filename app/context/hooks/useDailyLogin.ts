/**
 * useDailyLogin — React Query hook for daily login streak.
 * Auto-records a login on first load, returns streak state.
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goeyToast } from 'goey-toast';
import type { DailyLoginStreak } from '@/context/types/daily-login';

async function fetchDailyLogin(): Promise<DailyLoginStreak> {
    const res = await fetch('/api/streak/daily-login');
    if (!res.ok) throw new Error('Failed to fetch daily login');
    return res.json();
}

async function recordDailyLogin(): Promise<DailyLoginStreak> {
    const res = await fetch('/api/streak/daily-login', {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to record daily login');
    return res.json();
}

export function useDailyLogin() {
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery<DailyLoginStreak>({
        queryKey: ['daily-login'],
        queryFn: fetchDailyLogin,
        staleTime: 60_000, // 1 minute
    });

    const recordLogin = useMutation({
        mutationFn: recordDailyLogin,
        onSuccess: (result) => {
            queryClient.setQueryData(['daily-login'], result);
            // Also invalidate leaderboard since offchain_xp changed
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
            goeyToast.success(`Day ${result.currentStreak} Streak! \ud83d\udd25`, {
                description: `+${result.todayXp ?? 10} XP daily login bonus claimed!`,
            });
        },
    });

    return {
        dailyLogin: data ?? null,
        isLoading,
        error,
        recordLogin,
    };
}
