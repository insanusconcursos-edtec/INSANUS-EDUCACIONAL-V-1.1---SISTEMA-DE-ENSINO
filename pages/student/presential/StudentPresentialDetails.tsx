import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { classService } from '../../../services/classService';
import { courseService } from '../../../services/courseService';
import { Class } from '../../../types/class';
import { OnlineCourse, CourseModule } from '../../../types/course';
import { ArrowLeft, Calendar, GraduationCap, BookOpen, ChevronDown } from 'lucide-react';
import { StudentClassSchedule } from '../../../components/student/presential/StudentClassSchedule';
import { StudentModuleCard } from '../../../components/student/courses/StudentModuleCard';
import { CoursePlayer } from '../../../components/student/courses/player/CoursePlayer';
import { StudentPedagogicalPlanning } from '../../../components/student/presential/StudentPedagogicalPlanning';
import { ConcursoStatusBanner } from '../../../components/student/presential/ConcursoStatusBanner';

export const StudentPresentialDetails: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const moduleIdParam = searchParams.get('module');
  
  const [currentClass, setCurrentClass] = useState<Class | null>(null);
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'PLANNING' | 'TEACHING'>('TEACHING');
  const [loading, setLoading] = useState(true);
  
  // Teaching Tab State
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [loadingModules, setLoadingModules] = useState(false);

  const tabs = [
    { id: 'TEACHING', label: 'ÁREA DE ENSINO', icon: GraduationCap },
    { id: 'SCHEDULE', label: 'CRONOGRAMA', icon: Calendar },
    { id: 'PLANNING', label: 'PLANEJAMENTO PEDAGÓGICO', icon: BookOpen },
  ] as const;

  useEffect(() => {
    const fetchClass = async () => {
      if (classId) {
        try {
          const data = await classService.getClassById(classId);
          setCurrentClass(data);
        } catch (error) {
          console.error("Error fetching class:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchClass();
  }, [classId]);

  useEffect(() => {
    const fetchModules = async () => {
      if (activeTab === 'TEACHING' && currentClass) {
        setLoadingModules(true);
        try {
          const data = await courseService.getModules(currentClass.id);
          setModules(data);
        } catch (error) {
          console.error("Error fetching modules:", error);
        } finally {
          setLoadingModules(false);
        }
      }
    };

    fetchModules();
  }, [activeTab, currentClass]);

  // Deep Linking: Switch to Teaching tab if module param is present, or Planning if tab param is present
  useEffect(() => {
    if (moduleIdParam) {
      setActiveTab('TEACHING');
    }
    const tabParam = searchParams.get('tab');
    if (tabParam?.toUpperCase() === 'PLANNING') {
      setActiveTab('PLANNING');
    }
  }, [moduleIdParam, searchParams]);

  // Deep Linking: Auto-select module when modules are loaded
  useEffect(() => {
    if (moduleIdParam && modules.length > 0 && activeTab === 'TEACHING' && !selectedModule) {
      const module = modules.find(m => m.id === moduleIdParam);
      if (module) {
        setSelectedModule(module);
      }
    }
  }, [moduleIdParam, modules, activeTab, selectedModule]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!currentClass) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white">
        <h2 className="text-2xl font-bold mb-4">Turma não encontrada</h2>
        <button 
          onClick={() => navigate('/app/presential')}
          className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Voltar para Turmas
        </button>
      </div>
    );
  }

  // Adapter to use CoursePlayer with Class data
  const fakeCourse: OnlineCourse = {
    id: currentClass.id,
    title: currentClass.name,
    coverUrl: currentClass.coverImage,
    bannerUrlDesktop: currentClass.bannerUrlDesktop,
    bannerUrlTablet: currentClass.bannerUrlTablet,
    bannerUrlMobile: currentClass.bannerUrlMobile,
    categoryId: currentClass.category,
    subcategoryId: currentClass.subcategory,
    organization: currentClass.organization,
    createdAt: currentClass.createdAt || new Date().toISOString(),
    updatedAt: currentClass.updatedAt || new Date().toISOString(),
    active: true
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 pb-20">
      {/* --- BANNER RESPONSIVO --- */}
      <div className="relative w-full bg-zinc-900">
        <button 
          onClick={() => navigate('/app/presential')}
          className="absolute top-4 left-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors backdrop-blur-sm"
        >
          <ArrowLeft size={24} />
        </button>
        
        <picture>
          <source 
            media="(min-width: 1024px)" 
            srcSet={currentClass.bannerUrlDesktop || currentClass.coverImage} 
          />
          <source 
            media="(min-width: 768px)" 
            srcSet={currentClass.bannerUrlTablet || currentClass.bannerUrlDesktop || currentClass.coverImage} 
          />
          <img 
            src={currentClass.bannerUrlMobile || currentClass.coverImage} 
            alt={`Banner da turma ${currentClass.name}`} 
            className="w-full h-48 md:h-[400px] object-cover border-b border-red-600/30 shadow-lg"
          />
        </picture>
        
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent h-24 md:h-32 pointer-events-none"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <ConcursoStatusBanner classData={currentClass} />
      </div>

      {/* --- NAVEGAÇÃO DE ABAS --- */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-zinc-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          {/* Desktop Tabs Navigation */}
          <div className="hidden md:flex items-center space-x-8 overflow-x-auto no-scrollbar py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-base font-medium transition-colors whitespace-nowrap border-b-2 ${
                  activeTab === tab.id 
                    ? 'border-red-600 text-red-600' 
                    : 'border-transparent text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Mobile Select Navigation */}
          <div className="md:hidden flex justify-center py-3">
            <div className="relative w-full max-w-[280px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600 pointer-events-none">
                {React.createElement(tabs.find(t => t.id === activeTab)?.icon || GraduationCap, { size: 18 })}
              </div>
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg pl-10 pr-10 py-2.5 text-sm font-bold appearance-none focus:outline-none focus:ring-1 focus:ring-red-600/50"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- ÁREA DE CONTEÚDO --- */}
      <div className="max-w-7xl mx-auto px-4 mt-6 md:mt-8">
        {activeTab === 'TEACHING' && (
          selectedModule ? (
            <CoursePlayer 
              course={fakeCourse} 
              module={selectedModule} 
              onBack={() => setSelectedModule(null)} 
            />
          ) : (
            loadingModules ? (
              <div className="flex gap-4 overflow-hidden">
                {[1,2,3].map(i => <div key={i} className="w-60 h-[300px] bg-gray-900 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-200 flex items-center">
                  <GraduationCap className="mr-2 text-red-500" />
                  Módulos de Ensino
                </h3>
                
                {modules.length === 0 ? (
                  <div className="p-8 text-center bg-gray-900/50 rounded-xl border border-gray-800 text-gray-500">
                    Nenhum módulo disponível para esta turma.
                  </div>
                ) : (
                  <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-transparent px-1">
                    {modules.map(module => (
                      <StudentModuleCard 
                        key={module.id} 
                        module={module} 
                        onClick={setSelectedModule} 
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          )
        )}

        {activeTab === 'SCHEDULE' && (
          <StudentClassSchedule classId={currentClass.id} />
        )}

        {activeTab === 'PLANNING' && (
          <StudentPedagogicalPlanning 
            classId={currentClass.id} 
            totalMeetings={currentClass.totalMeetings}
          />
        )}
      </div>
    </div>
  );
};
