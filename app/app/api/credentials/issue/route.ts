/**
 * POST /api/credentials/issue
 *
 * Backend-signed credential issuance endpoint.
 *
 * Flow:
 * 1. Authenticate the learner via session
 * 2. Fetch course data to resolve trackId → trackCollection
 * 3. Verify the course is finalized
 * 4. Issue or upgrade credential NFT
 * 5. Return the credential asset address and tx signature
 *
 * Request body: {
 *   courseId: string,
 *   credentialName?: string, (auto-generated from course + track if not provided)
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Connection, PublicKey } from '@solana/web3.js';
import { getRpcUrl, safeErrorDetails } from '@/context/env';
import { loadBackendSigner } from '@/context/solana/backend-signer';
import {
    issueCredential,
    upgradeCredential,
    checkCredentialStatus,
    getTrackCollection,
    TRACK_NAMES,
} from '@/context/solana/credential-service';
import { getMetadataUri } from '@/backend/certificate/certificate-metadata';
import { fetchCourseById } from '@/context/solana/course-service';
import { getXpBalance } from '@/context/solana/xp';
import { prisma } from '@/backend/prisma';
import { authOptions } from '@/backend/auth/auth-options';

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // 2. Parse and validate body
        const body = await request.json();
        const { courseId, credentialName: customName } = body;

        if (!courseId || typeof courseId !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid courseId' },
                { status: 400 }
            );
        }

        // 3. Get learner wallet from linked accounts
        const linkedAccount = await prisma.linked_accounts.findFirst({
            where: {
                user_id: session.user.id,
                provider: 'wallet',
            },
            select: { provider_id: true },
        });

        if (!linkedAccount?.provider_id) {
            return NextResponse.json(
                { error: 'No linked wallet found. Link a wallet first.' },
                { status: 400 }
            );
        }

        const walletAddress = linkedAccount.provider_id;
        const learner = new PublicKey(walletAddress);
        const connection = new Connection(getRpcUrl(), 'confirmed');
        const backendSigner = loadBackendSigner();

        // 4. Fetch course data to resolve trackId → trackCollection
        const course = await fetchCourseById(connection, courseId);
        if (!course) {
            return NextResponse.json(
                { error: 'Course not found on-chain.' },
                { status: 404 }
            );
        }

        // Resolve track collection address from env config
        let trackCollectionPubkey: PublicKey;
        try {
            trackCollectionPubkey = getTrackCollection(course.trackId);
        } catch {
            return NextResponse.json(
                { error: `Track collection not configured for track ${course.trackId}. Set TRACK_COLLECTIONS env var.` },
                { status: 500 }
            );
        }

        // Auto-generate credential name from course + track
        const trackName = TRACK_NAMES[course.trackId] || 'Solana Developer';
        const credentialName = customName || `${trackName} — Course ${courseId}`;

        // Auto-generate metadata URI
        const metadataUri = getMetadataUri(courseId, walletAddress);

        // Get on-chain XP balance for metadata
        const totalXp = await getXpBalance(connection, learner);

        // 5. Check if credential already exists (issue vs upgrade)
        const status = await checkCredentialStatus(connection, courseId, learner);

        if (!status.finalized) {
            return NextResponse.json(
                { error: 'Course not finalized. Complete all lessons first.' },
                { status: 400 }
            );
        }

        if (status.hasCredential && status.credentialAsset) {
            // Upgrade existing credential
            const result = await upgradeCredential(
                connection,
                backendSigner,
                backendSigner, // payer = backend signer
                {
                    learner,
                    courseId,
                    credentialAsset: new PublicKey(status.credentialAsset),
                    newName: credentialName,
                    newMetadataUri: metadataUri,
                    coursesCompleted: 1,
                    totalXp,
                    trackCollection: trackCollectionPubkey,
                }
            );

            return NextResponse.json({
                action: 'upgraded',
                credentialAsset: status.credentialAsset,
                signature: result.signature,
            });
        }

        // Issue new credential
        const result = await issueCredential(
            connection,
            backendSigner,
            backendSigner, // payer = backend signer
            {
                learner,
                courseId,
                credentialName,
                metadataUri,
                coursesCompleted: 1,
                totalXp,
                trackCollection: trackCollectionPubkey,
            }
        );

        return NextResponse.json({
            action: 'issued',
            credentialAsset: result.credentialAsset.toBase58(),
            signature: result.signature,
        });
    } catch (error) {
        console.error('Credential issuance failed:', error);
        return NextResponse.json(
            { error: 'Credential operation failed', details: safeErrorDetails(error) },
            { status: 500 }
        );
    }
}

