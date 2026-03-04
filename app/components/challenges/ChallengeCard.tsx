/**
 * ChallengeCard — matches CourseCard design exactly.
 *
 * Same layout: glass-effect container, solid-color icon area on top
 * with track icon, centered title, difficulty/XP badges, footer with
 * Start Challenge button. No hover animations or gradients on cards.
 */
'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight, Code2, Zap } from 'lucide-react';
import { Link } from '@/context/i18n/navigation';
import type { ChallengeItem } from '@/context/hooks/useChallenges';
import type { Difficulty } from '@/context/types/course';
import { getTrackName } from '@/context/course/tracks';
import { CourseDifficultyBadge } from '@/components/course/CourseDifficultyBadge';
import { CourseStatsBadge } from '@/components/course/CourseStatsBadge';
import { getTrackIconComponent } from '@/components/course/CourseTrackIcons';

interface ChallengeCardProps {
    challenge: ChallengeItem;
    index?: number;
}

/** Same dashboard card colors as CourseCard */
const CARD_COLORS = [
    { solid: 'var(--dash-card-peach)', rgb: '255,203,164' },
    { solid: 'var(--dash-card-mint)', rgb: '168,240,204' },
    { solid: 'var(--dash-card-lavender)', rgb: '196,176,240' },
    { solid: 'var(--dash-card-pink)', rgb: '98,201,183' },
    { solid: 'var(--dash-card-mauve)', rgb: '240,168,216' },
] as const;

export function ChallengeCard({ challenge, index = 0 }: ChallengeCardProps) {
    const t = useTranslations('challenges.card');
    const tc = useTranslations('courses');
    const trackName = getTrackName(challenge.trackId);
    const palette = CARD_COLORS[index % CARD_COLORS.length];
    const TrackIcon = getTrackIconComponent(challenge.trackId);

    return (
        <Link
            href={challenge.linkHref}
            className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-zinc-200/80 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.04] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            id={`challenge-card-${challenge.courseId}-${challenge.lessonIndex}`}
            aria-label={`${challenge.language} challenge: ${challenge.lessonTitle}`}
        >
            {/* Subtle color tint overlay */}
            <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{ backgroundColor: `rgba(${palette.rgb}, 0.1)` }}
            />

            {/* Glass shimmer overlay */}
            <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                    background: `linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%, rgba(255,255,255,0.08) 100%)`,
                    maskImage: 'linear-gradient(135deg, black 40%, transparent 60%)',
                    WebkitMaskImage: 'linear-gradient(135deg, black 40%, transparent 60%)',
                }}
            />

            {/* Inner content — above shimmer */}
            <div className="relative z-10 flex flex-col h-full p-3.5 sm:p-4 gap-4 sm:gap-5">

                {/* Solid-color icon area */}
                <div
                    className="w-full flex flex-col items-center justify-center rounded-[1.75rem] sm:rounded-[2rem] py-8 sm:py-10 relative"
                    style={{ backgroundColor: palette.solid }}
                >
                    {/* Track name + level badges */}
                    <div className="absolute top-3 sm:top-4 left-4 sm:left-5 right-4 sm:right-5 flex items-center justify-between">
                        <span
                            className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-supreme"
                            style={{ color: '#1b231d' }}
                        >
                            {trackName}
                        </span>
                        <span
                            className="text-[9px] sm:text-[10px] font-medium font-supreme px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: '#1b231d' }}
                        >
                            {tc('level', { level: challenge.trackLevel })}
                        </span>
                    </div>

                    {/* Custom SVG icon */}
                    <TrackIcon size={48} className="drop-shadow-sm" />
                </div>

                {/* Content area */}
                <div className="flex flex-col gap-2.5 flex-1">
                    {/* Challenge title — centered like CourseCard */}
                    <h3 className="text-sm sm:text-base font-bold font-supreme text-foreground text-center leading-snug m-0 line-clamp-2">
                        {challenge.lessonTitle}
                    </h3>

                    {/* Course name */}
                    <p className="text-[11px] sm:text-xs text-muted-foreground font-supreme text-center line-clamp-1 leading-relaxed">
                        {challenge.courseTitle}
                    </p>

                    {/* Meta badges */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <CourseDifficultyBadge difficulty={challenge.difficulty} />
                        <CourseStatsBadge Icon={Code2} label={challenge.language.toUpperCase()} />
                        <CourseStatsBadge Icon={Zap} label={`${challenge.xpReward} XP`} variant="xp" />
                    </div>

                    {/* Footer — Start Challenge button */}
                    <div className="flex items-center justify-center mt-auto pt-3 border-t border-border dark:border-zinc-700">
                        <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold font-supreme text-accent-foreground bg-accent px-3 py-1 rounded-full">
                            {t('startChallenge')}
                            <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
