
// Force static generation - this about page has no dynamic content
export const dynamic = 'force-static';

// Import all sections
import StorySection from './_sections/StorySection'
import MissionSection from './_sections/MissionSection'
import TeamSection from './_sections/TeamSection'
import CTASection from './_sections/CTASection'

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-white">
      <StorySection />
      <MissionSection />
      <TeamSection />
      <CTASection />
    </div>
  )
}
