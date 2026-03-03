/**
 * VideoPlayer — Renders video lessons from YouTube/Vimeo URLs or direct Sanity file uploads.
 *
 * Supports:
 *   - YouTube URLs (youtube.com, youtu.be) → responsive iframe embed
 *   - Vimeo URLs → responsive iframe embed
 *   - Sanity uploaded video files → HTML5 <video> with controls
 *   - Generic video URLs → HTML5 <video> fallback
 */
'use client';

import { useMemo } from 'react';

interface VideoPlayerProps {
    videoUrl?: string;
    videoFileRef?: string;
    title?: string;
}

/** Extract YouTube video ID from various URL formats */
function getYouTubeId(url: string): string | null {
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('youtube.com')) {
            return parsed.searchParams.get('v');
        }
        if (parsed.hostname === 'youtu.be') {
            return parsed.pathname.slice(1);
        }
    } catch { /* not a valid URL */ }
    return null;
}

/** Extract Vimeo video ID */
function getVimeoId(url: string): string | null {
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('vimeo.com')) {
            const match = parsed.pathname.match(/\/(\d+)/);
            return match ? match[1] : null;
        }
    } catch { /* not a valid URL */ }
    return null;
}

export function VideoPlayer({ videoUrl, videoFileRef, title }: VideoPlayerProps) {
    const embedInfo = useMemo(() => {
        if (!videoUrl && !videoFileRef) return null;

        if (videoUrl) {
            const ytId = getYouTubeId(videoUrl);
            if (ytId) return { type: 'youtube' as const, embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0` };

            const vimeoId = getVimeoId(videoUrl);
            if (vimeoId) return { type: 'vimeo' as const, embedUrl: `https://player.vimeo.com/video/${vimeoId}?dnt=1` };

            // Generic URL — treat as direct video file
            return { type: 'direct' as const, src: videoUrl };
        }

        // Sanity file reference — resolve to CDN URL
        if (videoFileRef) {
            // videoFileRef format: "file-<id>-<ext>" from Sanity asset._ref
            const match = videoFileRef.match(/^file-(.+)-(\w+)$/);
            if (match) {
                const [, id, ext] = match;
                const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
                const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
                if (projectId) {
                    return {
                        type: 'direct' as const,
                        src: `https://cdn.sanity.io/files/${projectId}/${dataset}/${id}.${ext}`,
                    };
                }
            }
        }

        return null;
    }, [videoUrl, videoFileRef]);

    if (!embedInfo) {
        return (
            <div className="video-empty">
                <div className="video-empty-icon">🎥</div>
                <p>No video available for this lesson.</p>
                <style jsx>{`
                    .video-empty {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        min-height: 400px;
                        background: #0f0f1a;
                        color: rgba(255, 255, 255, 0.4);
                        font-size: 0.9rem;
                    }
                    .video-empty-icon {
                        font-size: 3rem;
                        margin-bottom: 16px;
                        opacity: 0.6;
                    }
                `}</style>
            </div>
        );
    }

    if (embedInfo.type === 'youtube' || embedInfo.type === 'vimeo') {
        return (
            <div className="video-container">
                <div className="video-wrapper">
                    <iframe
                        src={embedInfo.embedUrl}
                        title={title || 'Video lesson'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="video-iframe"
                    />
                </div>
                <style jsx>{`
                    .video-container {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        background: #0a0a0f;
                        padding: 20px;
                    }
                    .video-wrapper {
                        position: relative;
                        width: 100%;
                        max-width: 960px;
                        aspect-ratio: 16 / 9;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                        border: 1px solid rgba(255, 255, 255, 0.06);
                    }
                    .video-iframe {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        border: 0;
                    }
                `}</style>
            </div>
        );
    }

    // Direct video file
    return (
        <div className="video-container">
            <div className="video-wrapper">
                <video
                    src={embedInfo.src}
                    controls
                    preload="metadata"
                    className="video-element"
                >
                    Your browser does not support the video tag.
                </video>
            </div>
            <style jsx>{`
                .video-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    background: #0a0a0f;
                    padding: 20px;
                }
                .video-wrapper {
                    width: 100%;
                    max-width: 960px;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                }
                .video-element {
                    width: 100%;
                    display: block;
                    background: #000;
                }
            `}</style>
        </div>
    );
}
