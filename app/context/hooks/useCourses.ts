/**
 * React Query hooks for course data fetching.
 *
 * Provides useCourses, useActiveCourses, useCourse, and
 * useCoursesByTrack hooks that fetch from the /api/courses endpoints.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import type { Course } from '@/context/types/course';

/** Response shape from /api/courses */
interface CoursesResponse {
    courses: Course[];
    count: number;
}

/** Response shape from /api/courses/[id] */
interface CourseResponse {
    course: Course;
}

/**
 * Fetch all courses from the API.
 */
export function useCourses() {
    return useQuery<Course[]>({
        queryKey: ['courses'],
        queryFn: async () => {
            const response = await fetch('/api/courses');
            if (!response.ok) {
                throw new Error('Failed to fetch courses');
            }
            const data: CoursesResponse = await response.json();
            return data.courses;
        },
        staleTime: 60_000, // 1 minute
    });
}

/**
 * Fetch only active courses, enriched with Sanity CMS titles/descriptions.
 */
export function useActiveCourses() {
    return useQuery<Course[]>({
        queryKey: ['courses', 'active'],
        queryFn: async () => {
            // Fetch on-chain courses and Sanity summaries in parallel
            const [coursesRes, cmsRes] = await Promise.all([
                fetch('/api/courses?active=true'),
                fetch('/api/cms/courses').catch(() => null),
            ]);

            if (!coursesRes.ok) {
                throw new Error('Failed to fetch active courses');
            }
            const data: CoursesResponse = await coursesRes.json();

            // Try to merge Sanity data (graceful fallback if CMS unavailable)
            if (cmsRes?.ok) {
                try {
                    const { courses: cmsCourses } = (await cmsRes.json()) as {
                        courses: Array<{
                            onChainCourseId: string;
                            title: string;
                            description: string;
                            thumbnail: string | null;
                        }>;
                    };

                    // Build lookup map
                    const cmsMap = new Map(cmsCourses.map((c) => [c.onChainCourseId, c]));

                    // Enrich on-chain courses with Sanity data
                    return data.courses.map((course) => {
                        const cms = cmsMap.get(course.courseId);
                        if (cms) {
                            return {
                                ...course,
                                title: cms.title,
                                description: cms.description,
                                thumbnail: cms.thumbnail ?? undefined,
                            };
                        }
                        return course;
                    });
                } catch {
                    // CMS parse failed — return on-chain data as-is
                }
            }

            return data.courses;
        },
        staleTime: 60_000,
    });
}

/**
 * Fetch a single course by ID.
 */
export function useCourse(courseId: string | undefined) {
    return useQuery<Course | null>({
        queryKey: ['course', courseId],
        queryFn: async () => {
            if (!courseId) return null;
            const response = await fetch(`/api/courses/${courseId}`);
            if (response.status === 404) {
                return null;
            }
            if (!response.ok) {
                throw new Error('Failed to fetch course');
            }
            const data: CourseResponse = await response.json();
            return data.course;
        },
        enabled: !!courseId,
        staleTime: 60_000,
    });
}

/**
 * Fetch courses filtered by track ID.
 */
export function useCoursesByTrack(trackId: number | undefined) {
    return useQuery<Course[]>({
        queryKey: ['courses', 'track', trackId],
        queryFn: async () => {
            if (!trackId) return [];
            const response = await fetch(`/api/courses?track=${trackId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch courses by track');
            }
            const data: CoursesResponse = await response.json();
            return data.courses;
        },
        enabled: !!trackId,
        staleTime: 60_000,
    });
}
