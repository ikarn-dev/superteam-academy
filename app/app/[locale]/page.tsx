import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import { authOptions } from '@/backend/auth/auth-options';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingHero } from '@/components/landing/LandingHero';

/* ── Below-fold sections: lazy loaded to reduce initial JS bundle ── */
const LandingAbout = dynamic(() => import('@/components/landing/LandingAbout').then(m => ({ default: m.LandingAbout })));
const LandingFeatures = dynamic(() => import('@/components/landing/LandingFeatures').then(m => ({ default: m.LandingFeatures })));
const LandingCourses = dynamic(() => import('@/components/landing/LandingCourses').then(m => ({ default: m.LandingCourses })));
const LandingAssessment = dynamic(() => import('@/components/landing/LandingAssessment').then(m => ({ default: m.LandingAssessment })));
const LandingTestimonials = dynamic(() => import('@/components/landing/LandingTestimonials').then(m => ({ default: m.LandingTestimonials })));
const LandingFAQ = dynamic(() => import('@/components/landing/LandingFAQ').then(m => ({ default: m.LandingFAQ })));
const LandingFooter = dynamic(() => import('@/components/landing/LandingFooter').then(m => ({ default: m.LandingFooter })));

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingAbout />
        <LandingFeatures />
        <LandingCourses />
        <LandingAssessment />
        <LandingTestimonials />
        <LandingFAQ />
      </main>
      <LandingFooter />
    </div>
  );
}
