/**
 * Routes layout — wraps authenticated/app pages with providers.
 *
 * Heavy providers (Solana wallet, Auth, React Query) are loaded here
 * instead of in the locale layout, so the public landing page doesn't
 * pull in ~208 KiB of unused JS.
 *
 * WalletProvider is dynamically imported with ssr:false because wallet
 * operations are purely client-side — deferring @solana/web3.js until
 * after hydration eliminates ~104 KiB from the initial JS payload on
 * every authenticated page.
 */

'use client';

import dynamic from 'next/dynamic';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { NotificationProvider } from '@/context/stores/notificationStore';
import { ToastProvider } from '@/app/providers/ToastProvider';

const LazyWalletProvider = dynamic(
    () => import('@/app/providers/WalletProvider').then(mod => ({ default: mod.WalletProvider })),
    { ssr: false }
);

const LazyQueryProvider = dynamic(
    () => import('@/app/providers/QueryProvider').then(mod => ({ default: mod.QueryProvider })),
    { ssr: false }
);

export default function RoutesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <LazyQueryProvider>
            <LazyWalletProvider>
                <AuthProvider>
                    <NotificationProvider>
                        {children}
                        <ToastProvider />
                    </NotificationProvider>
                </AuthProvider>
            </LazyWalletProvider>
        </LazyQueryProvider>
    );
}
