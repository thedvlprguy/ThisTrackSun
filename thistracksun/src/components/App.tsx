import React from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a1a 60%, #00ff88 100%)', color: '#fff', fontFamily: 'Fira Mono, monospace', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: '#2d2d2d', padding: '1.5rem 2rem', borderBottom: '2px solid #00ff88', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ color: '#00ff88', fontWeight: 800, fontSize: '2.2rem', letterSpacing: '2px', fontFamily: 'Fira Mono, monospace' }}>thistracksun</h1>
        <SignedIn>
          <UserButton />
        </SignedIn>
        <SignedOut>
          <SignInButton />
        </SignedOut>
      </header>
      <main style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <SignedIn>
          <div style={{ width: '100%', maxWidth: 700, background: '#222', borderRadius: 16, boxShadow: '0 4px 32px #00ff8855', padding: '2rem', margin: '2rem auto', textAlign: 'center' }}>
            <h2 style={{ color: '#00ff88', fontWeight: 700, fontSize: '1.5rem', marginBottom: 24 }}>Welcome to your Dashboard</h2>
            {/* TODO: Add blocked sites, detected NSFW sites, and controls here */}
            <p style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 16 }}>All your focus tools, blockers, and study helpers in one funky, minimal place.</p>
            <div style={{ margin: '2rem 0', color: '#00ff88', fontWeight: 600, fontSize: '1.2rem' }}>
              🚧 Features coming soon: Blocked Sites, NSFW Detection, Group Study, and more!
            </div>
          </div>
        </SignedIn>
        <SignedOut>
          <div style={{ color: '#fff', fontSize: '1.2rem', marginTop: 40 }}>
            Please sign in to access your dashboard.
          </div>
        </SignedOut>
      </main>
      <footer style={{ background: '#2d2d2d', padding: '1rem 2rem', borderTop: '2px solid #00ff88', textAlign: 'center', color: '#00ff88', fontWeight: 600, letterSpacing: '1px' }}>
        Powered by thistracksun
      </footer>
    </div>
  );
} 