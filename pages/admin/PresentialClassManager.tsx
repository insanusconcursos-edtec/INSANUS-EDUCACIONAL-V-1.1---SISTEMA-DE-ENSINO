import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, DollarSign, BookOpen, Clock, LayoutDashboard, Monitor } from 'lucide-react';
import { classService } from '../../services/classService';
import { curriculumService } from '../../services/curriculumService';
import { teacherService } from '../../services/teacherService';
import { classScheduleService } from '../../services/classScheduleService';
import { Class } from '../../types/class';
import { Topic, Subject, Module } from '../../types/curriculum';
import { Teacher } from '../../types/teacher';
import { ClassScheduleEvent } from '../../types/schedule';
import { RemunerationTab } from '../../components/admin/presential/classes/manager/RemunerationTab';
import { SubjectsTab } from '../../components/admin/presential/classes/manager/SubjectsTab';
import { ScheduleTab } from '../../components/admin/presential/classes/manager/ScheduleTab';
import { PedagogicalPlanning } from '../../components/admin/presential/classes/manager/planning/PedagogicalPlanning';
import { TeachingEnvironment } from '../../components/admin/presential/classes/manager/teaching/TeachingEnvironment';
import { StudentsTab } from '../../components/admin/presential/classes/manager/StudentsTab';
import { formatSafeDateLocal } from '../../utils/dateUtils';

const PresentialClassManager: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  console.log("Montou Gerenciador da Turma:", classId);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentClass, setCurrentClass] = useState<Class | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<ClassScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Deep Linking: Sync tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      // Find matching tab ID (case-insensitive)
      const tabIds = ['overview', 'remuneration', 'subjects', 'schedule', 'PLANNING', 'TEACHING', 'students'];
      const matchedTab = tabIds.find(id => id.toLowerCase() === tab.toLowerCase());
      if (matchedTab) {
        setActiveTab(matchedTab);
      }
    }
  }, [searchParams]);

  const modules = useMemo(() => {
    return topics.flatMap(t => t.modules || []);
  }, [topics]);

  const fetchData = async (silent: boolean = false) => {
    if (!classId) return;
    try {
      if (!silent) {
        setLoading(true);
      }
      const [classData, topicsData, subjectsData, teachersData, eventsData] = await Promise.all([
        classService.getClassById(classId),
        curriculumService.getTopicsByClass(classId),
        curriculumService.getSubjectsByClass(classId),
        teacherService.getTeachers(),
        classScheduleService.getScheduleEventsByClass(classId)
      ]);
      setCurrentClass(classData);
      setTopics(topicsData);
      setSubjects(subjectsData);
      setTeachers(teachersData);
      setScheduleEvents(eventsData);
    } catch (error) {
      console.error("Error fetching class data:", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [classId]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-white">Carregando...</div>;
  }

  if (!currentClass) {
    return <div className="flex items-center justify-center h-screen text-white">Turma não encontrada.</div>;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
             {/* Stats Cards Placeholder */}
             <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                <h3 className="text-zinc-400 text-sm font-bold uppercase mb-2">Total de Encontros</h3>
                <p className="text-3xl font-bold text-white">{currentClass.totalMeetings}</p>
             </div>
             <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                <h3 className="text-zinc-400 text-sm font-bold uppercase mb-2">Alunos Matriculados</h3>
                <p className="text-3xl font-bold text-white">0/50</p>
             </div>
             <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                <h3 className="text-zinc-400 text-sm font-bold uppercase mb-2">Status</h3>
                <p className="text-3xl font-bold text-white">{currentClass.status}</p>
             </div>
          </div>
        );
      case 'remuneration':
        return (
          <RemunerationTab 
            cls={currentClass} 
            onUpdate={(silent) => fetchData(silent)} 
            events={scheduleEvents}
            teachers={teachers}
          />
        );
      case 'subjects':
        return <SubjectsTab cls={currentClass} onUpdate={(silent) => fetchData(silent)} />;
      case 'schedule':
        return (
          <ScheduleTab 
            cls={currentClass} 
            topics={topics} 
            subjects={subjects} 
            teachers={teachers} 
            onUpdate={(silent) => fetchData(silent)}
          />
        );
      case 'TEACHING':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">Ambiente de Ensino Virtual</h2>
              <p className="text-sm text-gray-400">Gerencie os recursos online, módulos, vídeos e PDFs que ficarão disponíveis para os alunos desta turma presencial.</p>
            </div>
            <TeachingEnvironment classId={currentClass.id} />
          </div>
        );
      case 'PLANNING':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">Planejamento Pedagógico (Edital Verticalizado)</h2>
              <p className="text-sm text-zinc-400">Acompanhe a estrutura do curso, materiais e o status das aulas agendadas.</p>
            </div>
            <PedagogicalPlanning 
              subjects={subjects} 
              topics={topics} 
              modules={modules} 
              events={scheduleEvents} 
              teachers={teachers} 
              totalMeetings={currentClass.totalMeetings}
            />
          </div>
        );
      case 'students':
        return <StudentsTab classId={currentClass.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <Link 
          to="/admin/presencial" 
          state={{ initialTab: 'CLASSES' }}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Turmas
        </Link>

        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
          <div className="w-24 h-32 rounded-lg overflow-hidden bg-zinc-800 shrink-0 shadow-lg">
            {currentClass.coverImage ? (
              <img src={currentClass.coverImage} alt={currentClass.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold text-xs">SEM CAPA</div>
            )}
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black uppercase tracking-tight">{currentClass.name}</h1>
              <span className="px-3 py-1 rounded-full bg-brand-red/10 text-brand-red text-xs font-bold border border-brand-red/20">
                {currentClass.type}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>{currentClass.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{currentClass.shift === 'MORNING' ? 'Manhã' : currentClass.shift === 'AFTERNOON' ? 'Tarde' : 'Noite'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Início: {formatSafeDateLocal(currentClass.startDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-zinc-800">
        <nav className="flex gap-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Visão Geral', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'remuneration', label: 'Remuneração', icon: <DollarSign className="w-4 h-4" /> },
            { id: 'subjects', label: 'Disciplinas', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'schedule', label: 'Cronograma', icon: <Calendar className="w-4 h-4" /> },
            { id: 'PLANNING', label: 'Planejamento', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'TEACHING', label: 'Ambiente de Ensino', icon: <Monitor className="w-4 h-4" /> },
            { id: 'students', label: 'Alunos', icon: <Users className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 pb-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2
                ${activeTab === tab.id 
                  ? 'border-brand-red text-white' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default PresentialClassManager;
