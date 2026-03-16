
import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { LogOut, Maximize2, Layout, GraduationCap, PlayCircle, Home, Video } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SystemLogo } from '../../common/SystemLogo';

const StudentHeader: React.FC = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Detect Context
  const isHomeContext = location.pathname.includes('/app/home');
  const isSimulatedContext = location.pathname.includes('/app/simulated');
  const isCoursesContext = location.pathname.includes('/app/courses');
  const isPresentialContext = location.pathname.includes('/app/presential');
  const isLiveEventsContext = location.pathname.includes('/app/eventos-ao-vivo');
  const isPlanContext = !isHomeContext && !isSimulatedContext && !isCoursesContext && !isPresentialContext && !isLiveEventsContext;

  // Lógica para o valor do Select Mobile
  let currentSelectValue = '/app/dashboard';
  if (isHomeContext) currentSelectValue = '/app/home';
  if (isSimulatedContext) currentSelectValue = '/app/simulated';
  if (isCoursesContext) currentSelectValue = '/app/courses';
  if (isPresentialContext) currentSelectValue = '/app/presential';
  if (isLiveEventsContext) currentSelectValue = '/app/eventos-ao-vivo';

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => console.log(e));
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <header className="h-16 w-full bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-3 md:px-6 sticky top-0 z-50">
      
      {/* --- ESQUERDA: LOGO --- */}
      <div className="flex items-center gap-2 select-none w-auto lg:w-48 shrink-0 transition-all">
        <SystemLogo />
      </div>

      {/* --- CENTRO: NAVEGAÇÃO HÍBRIDA --- */}

      {/* 1. VERSÃO DESKTOP (Botões) - Visível apenas em Desktop (hidden lg:flex) */}
      <div className="hidden lg:flex items-center gap-2 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50 mx-2">
        
        <Link
          to="/app/home"
          className={`
            relative flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300
            ${isHomeContext 
              ? 'bg-zinc-100 text-black shadow-[0_0_20px_rgba(255,255,255,0.15)]' 
              : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}
          `}
        >
          <Home className="w-3 h-3 lg:w-4 lg:h-4" />
          <span>HOME</span>
        </Link>

        <div className="w-px h-4 bg-zinc-800"></div>

        <Link
          to="/app/dashboard"
          className={`
            relative flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300
            ${isPlanContext 
              ? 'bg-brand-red text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' 
              : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}
          `}
        >
          <Layout className="w-3 h-3 lg:w-4 lg:h-4" />
          <span>PLANOS</span>
        </Link>

        <div className="w-px h-4 bg-zinc-800"></div>

        <Link
          to="/app/simulated"
          className={`
            relative flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300
            ${isSimulatedContext 
              ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)]' 
              : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}
          `}
        >
          <GraduationCap className="w-3 h-3 lg:w-4 lg:h-4" />
          <span>SIMULADOS</span>
        </Link>

        <div className="w-px h-4 bg-zinc-800"></div>

        <Link
          to="/app/courses"
          className={`
            relative flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300
            ${isCoursesContext 
              ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' 
              : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}
          `}
        >
          <PlayCircle className="w-3 h-3 lg:w-4 lg:h-4" />
          <span>CURSOS</span>
        </Link>

        <div className="w-px h-4 bg-zinc-800"></div>

        <Link
          to="/app/presential"
          className={`
            relative flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300
            ${isPresentialContext 
              ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(5,150,105,0.3)]' 
              : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}
          `}
        >
          <GraduationCap className="w-3 h-3 lg:w-4 lg:h-4" />
          <span>PRESENCIAL</span>
        </Link>

        <div className="w-px h-4 bg-zinc-800"></div>

        <Link
          to="/app/eventos-ao-vivo"
          className={`
            relative flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300
            ${isLiveEventsContext 
              ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' 
              : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}
          `}
        >
          <Video className="w-3 h-3 lg:w-4 lg:h-4" />
          <span>AO VIVO</span>
        </Link>
      </div>

      {/* 2. VERSÃO MOBILE/TABLET (Select Dropdown) - Visível apenas em Mobile/Tablet (flex lg:hidden) */}
      <div className="flex lg:hidden flex-1 mx-3 max-w-[240px]">
        <div className="relative w-full">
            <select
                value={currentSelectValue}
                onChange={(e) => navigate(e.target.value)}
                className="w-full appearance-none bg-zinc-900 border border-zinc-800 text-white text-[10px] font-bold uppercase rounded-lg py-2 pl-3 pr-8 focus:border-brand-red outline-none transition-colors truncate"
            >
                <option value="/app/home">🏠 Home</option>
                <option value="/app/dashboard">📌 Planos</option>
                <option value="/app/simulados">🎓 Simulados</option>
                <option value="/app/courses">▶️ Cursos</option>
                <option value="/app/presential">🏫 Presencial</option>
                <option value="/app/eventos-ao-vivo">🔴 Ao Vivo</option>
            </select>
            {/* Ícone de Seta customizado para o Select */}
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-500">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
        </div>
      </div>

      {/* --- DIREITA: UTILITÁRIOS --- */}
      <div className="flex items-center gap-2 lg:gap-6 w-auto lg:w-48 justify-end shrink-0">
        <button 
          onClick={toggleFullScreen}
          className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest group"
        >
          <Maximize2 className="w-4 h-4 text-zinc-600 group-hover:text-brand-red transition-colors" />
          <span className="hidden lg:inline">Tela Cheia</span>
        </button>
        
        <div className="h-4 w-px bg-zinc-800 hidden md:block"></div>
        
        <button 
          onClick={logout}
          className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest group"
        >
          <LogOut className="w-4 h-4 text-zinc-600 group-hover:text-brand-red transition-colors" />
          <span className="hidden lg:inline">Sair</span>
        </button>
      </div>
    </header>
  );
};

export default StudentHeader;
