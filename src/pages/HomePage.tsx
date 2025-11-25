interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="min-h-screen bg-[#F1F3F7] flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-5xl font-[800] text-[#1A1A1A] mb-[60px] tracking-tight" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
          Task Manager
        </h1>

        <div className="flex flex-col items-center gap-6">
          <button
            onClick={() => onNavigate('login')}
            className="w-full max-w-xs bg-[#004CFF] text-white font-[600] text-base px-9 py-4 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-200 hover:bg-[#0040CC] hover:shadow-[0_12px_32px_rgba(0,76,255,0.2)] hover:scale-105"
            style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
          >
            Login
          </button>

          <button
            onClick={() => onNavigate('signup')}
            className="w-full max-w-xs bg-white text-[#004CFF] font-[600] text-base px-9 py-4 rounded-2xl border-2 border-[#004CFF] shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-200 hover:bg-[#004CFF] hover:text-white hover:shadow-[0_12px_32px_rgba(0,76,255,0.2)] hover:scale-105"
            style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
          >
            Sign Up
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full max-w-xs bg-[#FF8A34] text-white font-[600] text-base px-9 py-4 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-200 hover:bg-[#E67A2A] hover:shadow-[0_12px_32px_rgba(255,138,52,0.2)] hover:scale-105"
            style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
