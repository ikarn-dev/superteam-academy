/**
 * Course sidebar — progress, enrollment CTA, stats, finalize.
 *
 * Design: solid bg-card, rounded-3xl, no gradients, no emojis.
 * Matches dashboard card patterns.
 *
 * Mock mode: shows a real "Enroll Now" button that triggers a
 * simulated enrollment flow with goey-toast (not auto-enrolled).
 * Email users can enroll without wallet; wallet users get a
 * simulated sign delay.
 */
'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { goeyToast } from 'goey-toast';
import { useAuth } from '@/app/providers/AuthProvider';
import type { CourseWithDetails } from '@/context/types/course';
import type { CourseProgressData } from '@/context/hooks/useLessonCompletion';
import { calculateCourseTotalXp } from '@/context/xp-calculations';
import { getTrackColor } from '@/context/course/tracks';

interface CourseSidebarProps {
    course: CourseWithDetails;
    progress: CourseProgressData | undefined;
    isEnrolling: boolean;
    isFinalizing: boolean;
    isIssuingCredential: boolean;
    credentialResult: { action: string; credentialAsset: string; signature: string } | null;
    enrollError: Error | null;
    finalizeError: Error | null;
    onEnroll: () => void;
    onFinalize: () => void;
    walletConnected: boolean;
    isMockMode?: boolean;
    /** Mock enrollment state — managed by parent */
    isMockEnrolled?: boolean;
    /** Callback when mock enrollment completes */
    onMockEnroll?: () => void;
}

export function CourseSidebar({
    course,
    progress,
    isEnrolling,
    isFinalizing,
    isIssuingCredential,
    credentialResult,
    enrollError,
    finalizeError,
    onEnroll,
    onFinalize,
    walletConnected,
    isMockMode = false,
    isMockEnrolled = false,
    onMockEnroll,
}: CourseSidebarProps) {
    const t = useTranslations('courses');
    const tc = useTranslations('common');
    const tl = useTranslations('lesson');
    const { user } = useAuth();
    const trackColor = getTrackColor(course.trackId);
    const totalXp = calculateCourseTotalXp(course.xpPerLesson, course.lessonCount);
    const isEnrolled = isMockMode ? isMockEnrolled : (progress?.isEnrolled ?? false);
    const isFullyCompleted = progress?.isFullyCompleted ?? false;
    const progressPercent = progress?.progressPercent ?? 0;
    const completedCount = progress?.completedCount ?? 0;
    const isFinalized = !!progress?.enrollment?.completedAt;

    // Mock enrollment state
    const [isMockEnrolling, setIsMockEnrolling] = useState(false);

    const handleMockEnroll = useCallback(async () => {
        setIsMockEnrolling(true);

        // Email users: instant enroll. Wallet users: simulate sign delay
        const hasWallet = walletConnected;
        const delay = hasWallet ? 1200 : 600;

        if (hasWallet) {
            goeyToast.info('Signing enrollment transaction...');
        }

        await new Promise((r) => setTimeout(r, delay));

        setIsMockEnrolling(false);
        goeyToast.success('Enrolled successfully!', {
            description: `You are now enrolled in ${course.title}`,
        });
        onMockEnroll?.();
    }, [walletConnected, course.title, onMockEnroll]);

    // Estimated duration: ~15min per lesson
    const estimatedMinutes = course.lessonCount * 15;
    const hours = Math.floor(estimatedMinutes / 60);
    const mins = estimatedMinutes % 60;
    const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return (
        <aside className="sticky top-20 bg-card border border-border rounded-3xl p-6 flex flex-col gap-5">
            {/* Progress Ring — only when enrolled and has progress */}
            {isEnrolled && progressPercent > 0 && (
                <div className="flex flex-col items-center gap-2">
                    <div className="relative w-[120px] h-[120px]">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                            <circle
                                cx="50" cy="50" r="42"
                                fill="none"
                                className="stroke-border"
                                strokeWidth="8"
                            />
                            <circle
                                cx="50" cy="50" r="42"
                                fill="none"
                                stroke={trackColor}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 42}`}
                                strokeDashoffset={`${2 * Math.PI * 42 * (1 - progressPercent / 100)}`}
                                transform="rotate(-90 50 50)"
                                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-extrabold text-foreground">{progressPercent}%</span>
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-supreme">
                        {tl('progress', { current: completedCount, total: course.lessonCount })}
                    </div>
                </div>
            )}

            {/* CTA Button */}
            {isMockMode ? (
                /* Mock enrollment flow */
                <div>
                    {isMockEnrolled ? (
                        <div className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-green-emerald/10 border border-brand-green-emerald/20 text-brand-green-emerald text-sm font-semibold font-supreme">
                            <CheckCircle className="w-4 h-4" />
                            Enrolled
                        </div>
                    ) : (
                        <button
                            className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-brand-green-emerald hover:bg-brand-green-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={handleMockEnroll}
                            disabled={isMockEnrolling}
                            type="button"
                        >
                            {isMockEnrolling ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {walletConnected ? 'Signing...' : 'Enrolling...'}
                                </span>
                            ) : (
                                t('enrollNow')
                            )}
                        </button>
                    )}
                </div>
            ) : (
                /* Real enrollment flow */
                <div>
                    {!walletConnected ? (
                        <button className="w-full py-3.5 rounded-xl text-sm font-bold bg-muted text-muted-foreground cursor-not-allowed" disabled>
                            {t('connectWalletToEnroll')}
                        </button>
                    ) : !isEnrolled ? (
                        <>
                            <button
                                className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${enrollError
                                        ? 'bg-destructive/15 border border-destructive/30 text-destructive'
                                        : 'text-white bg-brand-green-emerald hover:bg-brand-green-dark'
                                    }`}
                                onClick={onEnroll}
                                disabled={isEnrolling}
                            >
                                {isEnrolling ? t('enrolling') : enrollError ? tc('retry') : t('enrollNow')}
                            </button>
                            {enrollError && <p className="mt-2 text-xs text-destructive/70 text-center font-supreme">{enrollError.message}</p>}
                        </>
                    ) : isFullyCompleted && !isFinalized ? (
                        <>
                            <button
                                className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${finalizeError
                                        ? 'bg-destructive/15 border border-destructive/30 text-destructive'
                                        : 'bg-brand-yellow text-brand-black hover:opacity-90'
                                    }`}
                                onClick={onFinalize}
                                disabled={isFinalizing}
                            >
                                {isFinalizing ? t('finalizing') : finalizeError ? tc('retry') : t('finalizeClaim')}
                            </button>
                            {finalizeError && <p className="mt-2 text-xs text-destructive/70 text-center font-supreme">{finalizeError.message}</p>}
                        </>
                    ) : isFinalized ? (
                        <div className="text-center py-3.5 rounded-xl bg-brand-green-emerald/10 border border-brand-green-emerald/20 text-brand-green-emerald text-sm font-semibold flex flex-col gap-2">
                            <div className="flex items-center justify-center gap-1.5">
                                <CheckCircle className="w-4 h-4" />
                                {t('completed')}
                            </div>
                            {isIssuingCredential && (
                                <div className="flex items-center justify-center gap-1.5 text-xs text-brand-yellow/80 animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Minting credential NFT...
                                </div>
                            )}
                            {credentialResult && (
                                <a
                                    href={`https://explorer.solana.com/address/${credentialResult.credentialAsset}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-1 text-xs text-brand-green-emerald font-semibold hover:underline"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    View Credential NFT
                                </a>
                            )}
                        </div>
                    ) : (
                        <a href={`#lesson-${completedCount}`} className="block w-full py-3.5 rounded-xl text-sm font-bold text-center text-white bg-brand-green-emerald hover:bg-brand-green-dark transition-colors">
                            {t('continueLearning')}
                        </a>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="flex flex-col">
                {[
                    { label: tc('lessons'), value: course.lessonCount },
                    { label: tc('totalXp'), value: totalXp.toLocaleString(), isXp: true },
                    { label: t('xpPerLesson'), value: course.xpPerLesson },
                    { label: tc('duration'), value: durationStr },
                    { label: t('enrolled', { count: course.totalEnrollments }), value: course.totalEnrollments },
                    { label: t('completions'), value: course.totalCompletions },
                ].map((stat, i, arr) => (
                    <div
                        key={stat.label}
                        className={`flex justify-between items-center py-2.5 ${i < arr.length - 1 ? 'border-b border-border/50' : ''}`}
                    >
                        <span className="text-xs text-muted-foreground font-supreme">{stat.label}</span>
                        <span className={`text-sm font-semibold font-supreme ${stat.isXp ? 'text-brand-yellow' : 'text-foreground'}`}>
                            {stat.value}
                        </span>
                    </div>
                ))}
            </div>
        </aside>
    );
}
