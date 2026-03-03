'use client';

/**
 * React hooks for lesson completion and course progress tracking.
 *
 * Lesson completion is a backend-signed operation:
 * 1. Frontend sends POST /api/lessons/complete
 * 2. Backend validates, signs, and submits the transaction
 * 3. Frontend updates UI with new progress
 *
 * Progress is tracked via the on-chain enrollment bitmap.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { goeyToast } from 'goey-toast';
import {
    fetchEnrollment,
    type EnrollmentState,
} from '@/context/solana/enrollment-service';
import {
    countCompletedLessons,
    getProgressPercentage,
    isLessonComplete,
    isCourseFullyCompleted,
    getCompletedLessonIndices,
} from '@/context/solana/bitmap';

// ─── Types ───────────────────────────────────────────────────────────

/** Granular step tracking for lesson completion UX */
export type CompletionStep = 'idle' | 'submitting' | 'confirming';

interface LessonCompletionResult {
    success: boolean;
    signature: string;
    slot: number;
}

export interface CourseProgressData {
    enrollment: EnrollmentState | null;
    completedCount: number;
    totalLessons: number;
    progressPercent: number;
    completedIndices: number[];
    isFullyCompleted: boolean;
    isEnrolled: boolean;
}

// ─── Hooks ───────────────────────────────────────────────────────────

/**
 * Hook for completing a lesson via the backend API.
 *
 * Sends a POST request to /api/lessons/complete which is signed
 * by the backend signer (anti-cheat pattern).
 */
export function useLessonCompletion(courseId: string) {
    const { publicKey } = useWallet();
    const queryClient = useQueryClient();
    const [completionStep, setCompletionStep] = useState<CompletionStep>('idle');

    const mutation = useMutation<LessonCompletionResult, Error, number>({
        mutationFn: async (lessonIndex: number) => {
            if (!publicKey) throw new Error('Wallet not connected');

            setCompletionStep('submitting');
            const response = await fetch('/api/lessons/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId,
                    lessonIndex,
                    learnerWallet: publicKey.toBase58(),
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to complete lesson');
            }

            setCompletionStep('confirming');
            return response.json();
        },
        onSuccess: () => {
            setCompletionStep('idle');
            goeyToast.success('Lesson Completed! ✨', {
                description: 'XP earned — keep going!',
            });
            // Invalidate enrollment, progress, and XP queries
            queryClient.invalidateQueries({
                queryKey: ['enrollment', courseId],
            });
            queryClient.invalidateQueries({
                queryKey: ['course-progress', courseId],
            });
            queryClient.invalidateQueries({
                queryKey: ['xpBalance'],
            });
        },
        onError: (error) => {
            setCompletionStep('idle');
            goeyToast.error('Lesson Failed', {
                description: error.message,
            });
        },
    });

    return {
        completeLesson: mutation.mutate,
        completeLessonAsync: mutation.mutateAsync,
        isCompleting: mutation.isPending,
        completionStep,
        error: mutation.error,
        lastResult: mutation.data,
        reset: () => {
            mutation.reset();
            setCompletionStep('idle');
        },
    };
}

/**
 * Hook for finalizing a course via the backend API.
 *
 * Awards bonus XP and auto-issues a credential NFT after finalization.
 */
export function useCourseFinalization(courseId: string) {
    const { publicKey } = useWallet();
    const queryClient = useQueryClient();
    const [credentialResult, setCredentialResult] = useState<{
        action: string;
        credentialAsset: string;
        signature: string;
    } | null>(null);
    const [isIssuingCredential, setIsIssuingCredential] = useState(false);

    const mutation = useMutation<LessonCompletionResult, Error>({
        mutationFn: async () => {
            if (!publicKey) throw new Error('Wallet not connected');

            const response = await fetch('/api/courses/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId,
                    learnerWallet: publicKey.toBase58(),
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to finalize course');
            }

            return response.json();
        },
        onSuccess: async () => {
            goeyToast.success('Course Finalized! 🎉', {
                description: 'Bonus XP awarded — minting your credential...',
            });
            queryClient.invalidateQueries({
                queryKey: ['enrollment', courseId],
            });
            queryClient.invalidateQueries({
                queryKey: ['course-progress', courseId],
            });
            queryClient.invalidateQueries({
                queryKey: ['xpBalance'],
            });

            // Auto-issue credential NFT after finalization
            try {
                setIsIssuingCredential(true);
                const credResponse = await fetch('/api/credentials/issue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ courseId }),
                });

                if (credResponse.ok) {
                    const result = await credResponse.json();
                    setCredentialResult(result);
                    goeyToast.success('Credential Minted! 🎓', {
                        description: 'Your on-chain credential NFT has been issued to your wallet.',
                    });
                } else {
                    goeyToast.warning('Credential Pending', {
                        description: 'Course finalized but credential minting failed. Try again from your dashboard.',
                    });
                    console.warn('[useCourseFinalization] Credential issuance failed, course still finalized');
                }
            } catch (err) {
                goeyToast.warning('Credential Pending', {
                    description: 'Course finalized but credential minting encountered an error.',
                });
                console.warn('[useCourseFinalization] Credential issuance error:', err);
            } finally {
                setIsIssuingCredential(false);
            }
        },
        onError: (error) => {
            goeyToast.error('Finalization Failed', {
                description: error.message,
            });
        },
    });

    return {
        finalize: mutation.mutate,
        finalizeAsync: mutation.mutateAsync,
        isFinalizing: mutation.isPending,
        isIssuingCredential,
        credentialResult,
        error: mutation.error,
    };
}

/**
 * Hook for course progress tracking.
 *
 * Fetches the enrollment bitmap and computes:
 * - Number of completed lessons
 * - Progress percentage
 * - Whether the course is fully completed
 * - Per-lesson completion status
 */
export function useCourseProgress(courseId: string, totalLessons: number) {
    const { connection } = useConnection();
    const { publicKey } = useWallet();

    return useQuery<CourseProgressData>({
        queryKey: ['course-progress', courseId, publicKey?.toBase58()],
        queryFn: async () => {
            if (!publicKey) {
                return {
                    enrollment: null,
                    completedCount: 0,
                    totalLessons,
                    progressPercent: 0,
                    completedIndices: [],
                    isFullyCompleted: false,
                    isEnrolled: false,
                };
            }

            const enrollment = await fetchEnrollment(connection, courseId, publicKey);

            if (!enrollment) {
                return {
                    enrollment: null,
                    completedCount: 0,
                    totalLessons,
                    progressPercent: 0,
                    completedIndices: [],
                    isFullyCompleted: false,
                    isEnrolled: false,
                };
            }

            const flags = enrollment.lessonFlags;

            return {
                enrollment,
                completedCount: countCompletedLessons(flags, totalLessons),
                totalLessons,
                progressPercent: getProgressPercentage(flags, totalLessons),
                completedIndices: getCompletedLessonIndices(flags, totalLessons),
                isFullyCompleted: isCourseFullyCompleted(flags, totalLessons),
                isEnrolled: true,
            };
        },
        enabled: !!courseId && !!publicKey,
        staleTime: 15_000, // 15 seconds — progress may change frequently during learning
    });
}

/**
 * Check if a specific lesson is completed.
 * Uses data from the useCourseProgress hook.
 */
export function isLessonDone(
    progressData: CourseProgressData | undefined,
    lessonIndex: number
): boolean {
    if (!progressData?.enrollment) return false;
    return isLessonComplete(progressData.enrollment.lessonFlags, lessonIndex);
}
