import { MateLogo } from '@/components/icons'

const FS = { fontFeatureSettings: "'ss11' 1, 'calt' 0, 'liga' 0" }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[8px]">
      <h2
        className="text-[14px] leading-[20px] tracking-[-0.084px] font-medium text-text-strong"
        style={FS}
      >
        {title}
      </h2>
      <div className="text-[14px] leading-[20px] tracking-[-0.084px] font-normal text-text-sub" style={FS}>
        {children}
      </div>
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg-weak flex justify-center px-[24px] py-[64px]">
      <div className="flex flex-col gap-[40px] w-full max-w-[560px]">

        <div className="flex flex-col gap-[16px]">
          <MateLogo />
          <div className="flex flex-col gap-[4px]">
            <h1
              className="text-[20px] leading-[28px] tracking-[-0.3px] font-medium text-text-strong"
              style={FS}
            >
              Privacy Policy
            </h1>
            <p className="text-[14px] leading-[20px] tracking-[-0.084px] font-normal text-text-soft" style={FS}>
              Last updated: April 2026
            </p>
          </div>
          <p className="text-[14px] leading-[20px] tracking-[-0.084px] font-normal text-text-sub" style={FS}>
            Mate is a personal bookmark manager. We keep things simple — and that includes how we handle your data.
          </p>
        </div>

        <div className="flex flex-col gap-[24px]">
          <Section title="What we collect">
            <ul className="flex flex-col gap-[4px] list-none">
              <li>— Your email address, used only for signing in.</li>
              <li>— The URL and page title of bookmarks you save.</li>
            </ul>
            <p className="mt-[8px]">That&apos;s it. No tracking, no analytics, no fingerprinting.</p>
          </Section>

          <Section title="What we don't do">
            <p>We do not sell, share, or rent your data to any third party. Ever.</p>
          </Section>

          <Section title="Where your data lives">
            <p>
              Your data is stored securely via{' '}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-strong underline underline-offset-2"
              >
                Supabase
              </a>
              , which runs on AWS infrastructure. Data is encrypted in transit and at rest.
            </p>
          </Section>

          <Section title="Deleting your data">
            <p>
              You can delete your account at any time from the app settings. When you do, all your bookmarks and personal information are permanently removed.
            </p>
          </Section>

          <Section title="Questions?">
            <p>
              Reach out at{' '}
              <a
                href="mailto:contact@getmate.co"
                className="text-text-strong underline underline-offset-2"
              >
                contact@getmate.co
              </a>
              {' '}— we&apos;re happy to help.
            </p>
          </Section>
        </div>

      </div>
    </main>
  )
}
