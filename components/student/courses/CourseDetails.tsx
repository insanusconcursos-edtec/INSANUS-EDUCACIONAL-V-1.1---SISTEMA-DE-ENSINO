
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OnlineCourse, CourseModule, CONTEST_STATUS_LABELS } from '../../../types/course';
import { courseService } from '../../../services/courseService';
import { StudentModuleCard } from './StudentModuleCard';
import { CoursePlayer } from './player/CoursePlayer';
import { useAuth } from '../../../contexts/AuthContext';
import { AlertCircle, Calendar, CheckCircle2, Clock, Siren, LayoutList, ListTree, PlayCircle, ArrowLeft } from 'lucide-react';
import { StudentCourseEdital } from './edital/StudentCourseEdital';
import { CourseReviewDashboard } from './reviews/CourseReviewDashboard';

interface CourseDetailsProps {
  course: OnlineCourse;
  onBack: () => void;
}

export function CourseDetails({ course, onBack }: CourseDetailsProps) {
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  
  // ESTADO DAS ABAS (NOVO) - MÓDULOS ou EDITAL
  const [activeTab, setActiveTab] = useState<'MODULES' | 'EDITAL'>('MODULES');
  const [focusTopicId, setFocusTopicId] = useState<string | null>(null);

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  
  // Estado do Progresso Geral
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const loadData = async () => {
        try {
            // 1. Carrega Módulos
            const modulesData = await courseService.getModules(course.id);
            setModules(modulesData);

            // 2. Calcula Progresso Geral
            if (currentUser) {
                const [completedIds, stats] = await Promise.all([
                    courseService.getCompletedLessons(currentUser.uid, course.id),
                    courseService.getCourseStats(course.id)
                ]);
                
                const total = stats.totalLessons;
                const completed = completedIds.length;
                const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                
                setProgress(percentage);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [course.id, currentUser]);

  // Lógica para abrir módulo via URL
  useEffect(() => {
    const moduleId = searchParams.get('module');
    if (moduleId && modules.length > 0) {
      const module = modules.find(m => m.id === moduleId);
      if (module) {
        setSelectedModule(module);
      }
    }
  }, [searchParams, modules]);

  // Handler para Navegação via Review
  const handleReviewNow = (topicId: string) => {
      setActiveTab('EDITAL');
      setFocusTopicId(topicId);
  };

  if (selectedModule) {
      return (
        <CoursePlayer 
            course={course} 
            module={selectedModule} 
            onBack={() => setSelectedModule(null)} 
        />
      );
  }

  return (
    <div className="flex flex-col w-full animate-in fade-in pb-20 min-h-full">
      
      {/* ==================================================== */}
      {/* HERO BANNER RESPONSIVO (IGUAL PRESENCIAL)            */}
      {/* ==================================================== */}
      <div className="relative w-full mb-6 bg-zinc-900">
         
         {/* Botão Voltar */}
         <button 
            onClick={onBack}
            className="absolute top-4 left-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors backdrop-blur-sm"
         >
            <ArrowLeft size={24} />
         </button>

         <picture>
             <source media="(min-width: 768px)" srcSet={course.bannerUrlDesktop || course.coverUrl} />
             <img 
                src={course.bannerUrlMobile || course.coverUrl} 
                alt={`Banner do curso ${course.title}`} 
                className="w-full h-48 md:h-[400px] object-cover border-b border-red-600/30 shadow-lg" 
             />
         </picture>

         <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent h-24 md:h-32 pointer-events-none"></div>
      </div>

      <div className="w-full px-6 md:px-8">
          {/* BARRA DE AÇÕES E PROGRESSO (MOVIDA PARA BAIXO DO BANNER) */}
          <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                   {/* Botão de Ação Principal */}
                   <button className="flex items-center justify-center gap-2 bg-white hover:bg-gray-200 text-black px-8 py-3 rounded-lg font-black text-sm uppercase transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)] shrink-0">
                       <PlayCircle size={20} fill="currentColor" />
                       {progress > 0 ? 'CONTINUAR ESTUDOS' : 'INICIAR CURSO'}
                   </button>

                   <div className="flex items-center gap-4 flex-wrap w-full md:w-auto">
                      {/* Badge de Status */}
                      {course.contestStatus && course.contestStatus !== 'SEM_PREVISAO' && (
                          <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-bold text-xs uppercase shrink-0">
                              <CheckCircle2 size={16} className="text-green-500" />
                              <span className="text-gray-300">
                                {CONTEST_STATUS_LABELS[course.contestStatus]}
                                {course.contestStatus === 'BANCA_CONTRATADA' && course.examBoard && (
                                    <span className="text-white ml-1">: {course.examBoard}</span>
                                )}
                              </span>
                          </div>
                      )}

                      {/* Barra de Progresso */}
                      <div className="flex-1 min-w-[200px] max-w-md flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-lg p-3 px-4">
                          <span className="text-[10px] font-bold text-gray-400 uppercase hidden sm:block">Progresso</span>
                          <div className="flex-1 bg-black rounded-full h-1.5 overflow-hidden">
                              <div className="bg-red-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
                          </div>
                          <span className="text-sm font-black text-white">{progress}%</span>
                      </div>
                   </div>
              </div>
          </div>

          {/* DASHBOARD DE REVISÕES */}
          <div className="mb-8">
            <CourseReviewDashboard courseId={course.id} onReviewNow={handleReviewNow} />
          </div>

          {/* SISTEMA DE ABAS (NOVO) */}
          <div className="flex items-center gap-8 border-b border-gray-800 mb-8">
            <button 
                onClick={() => setActiveTab('MODULES')}
                className={`flex items-center gap-2 pb-4 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all
                    ${activeTab === 'MODULES' ? 'border-red-600 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}
                `}
            >
                <LayoutList size={18} />
                Módulos do Curso
            </button>
            <button 
                onClick={() => setActiveTab('EDITAL')}
                className={`flex items-center gap-2 pb-4 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all
                    ${activeTab === 'EDITAL' ? 'border-red-600 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}
                `}
            >
                <ListTree size={18} />
                Edital Verticalizado
            </button>
          </div>

          {/* CONTEÚDO CONDICIONAL */}
          <div>
              {activeTab === 'MODULES' ? (
                  // VISÃO DOS MÓDULOS
                  loading ? (
                      <div className="flex gap-4 overflow-hidden">
                          {[1,2,3].map(i => <div key={i} className="w-60 h-[300px] bg-zinc-900 rounded-lg animate-pulse" />)}
                      </div>
                  ) : modules.length === 0 ? (
                      <div className="text-zinc-500 italic px-1 text-sm border-l-2 border-zinc-800 pl-4 py-2">Nenhum módulo disponível neste curso.</div>
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
                  )
              ) : (
                  // VISÃO DO EDITAL VERTICALIZADO
                  <StudentCourseEdital 
                    courseId={course.id} 
                    focusTopicId={focusTopicId} 
                  />
              )}
          </div>
      </div>
    </div>
  );
}
