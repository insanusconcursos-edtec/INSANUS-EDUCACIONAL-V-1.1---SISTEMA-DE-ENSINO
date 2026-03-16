
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { 
  LayoutDashboard, Coffee, Loader2, AlertTriangle, 
  RefreshCw, CheckCircle2, FastForward, Clock, ShieldCheck, X, GraduationCap, Lock, Check, Trophy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { StudentGoalCard, StudentGoal } from '../../components/student/StudentGoalCard';
import { getDashboardData, toggleGoalStatus, getStudentConfig, getStudentCompletedMetas, getLocalISODate, checkAndUnlockSimulados } from '../../services/studentService';
import { rescheduleOverdueTasks, getNextPendingGoals, anticipateGoals, ScheduledEvent, fetchFullPlanData, scheduleUserSimulado, anticipateFutureGoals, anticipateAndShiftGoals } from '../../services/scheduleService';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { SimuladoDashboardCard, ComputedSimulado } from '../../components/student/SimuladoDashboardCard';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getExams } from '../../services/simulatedService';
import { SimuladoFocusMode } from '../../components/student/goals/SimuladoFocusMode';
import StudentMentorshipViewer from '../../components/student/mentorship/StudentMentorshipViewer';

const StudentDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');
  
  // Data State
  const [todayGoals, setTodayGoals] = useState<StudentGoal[]>([]);
  // Split Overdue State
  const [overdueReviews, setOverdueReviews] = useState<StudentGoal[]>([]);
  const [overdueGeneral, setOverdueGeneral] = useState<StudentGoal[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [currentPlanId, setCurrentPlanId] = useState<string>('');

  // Reschedule State
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  // Anticipation State
  const [showAnticipateModal, setShowAnticipateModal] = useState(false);
  const [availableTimeForAnticipation, setAvailableTimeForAnticipation] = useState(0);
  const [isAnticipating, setIsAnticipating] = useState(false);

  // --- SIMULADOS STATES ---
  const [computedSimulados, setComputedSimulados] = useState<{ 
    blocked: ComputedSimulado[], 
    released: ComputedSimulado[],
    scheduled: ComputedSimulado[]
  }>({ blocked: [], released: [], scheduled: [] });
  const [showScheduleModal, setShowScheduleModal] = useState<string | null>(null);
  const [simuladoDate, setSimuladoDate] = useState('');

  // --- MODO FOCO SIMULADO ---
  const [isExamMode, setIsExamMode] = useState(false);
  const [activeSimulado, setActiveSimulado] = useState<StudentGoal | null>(null);
  
  // PASSO 2: NOVO ESTADO DE CONFIRMAÇÃO DE INÍCIO
  const [examToConfirm, setExamToConfirm] = useState<StudentGoal | null>(null);

  // Fetch Data Function
  const fetchSchedule = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
        const { planId, overdue, today } = await getDashboardData(currentUser.uid);
        setCurrentPlanId(planId);
        
        // Helper Mapper
        const mapToGoal = (event: any): StudentGoal => ({
            id: event.id,
            metaId: event.metaId, // Essential for merge
            planId: event.planId, // Essential for merge
            date: event.date, // Essential for Time Tracking updates
            type: event.type,
            title: event.title,
            discipline: event.disciplineName || event.discipline || 'Geral',
            topic: event.topicName || event.subject || '',
            duration: event.duration,
            recordedMinutes: event.recordedMinutes || 0, // NEW: Track actual time
            isCompleted: event.status === 'completed',
            observation: event.observation,
            color: event.color || null,
            part: event.part, // Map Part Number
            order: event.order, // Map Order Number
            smartExtension: event.smartExtension || null, // Map the extension config
            
            // Review Specifics
            reviewLabel: event.reviewLabel,
            isSpacedReview: event.isSpacedReview || (event.type === 'review' && !!event.originalEventId),

            videos: event.videos || [],
            files: event.files || [],
            links: event.links || [],
            mindMap: event.mindMap || event.summaryConfig?.mindMap || [],
            flashcards: event.flashcards || event.reviewConfig?.flashcards || event.flashcardConfig?.cards || [],
            questions: event.questions || event.questionsConfig?.questions || [],
            contentCount: {
                video: event.videos?.length || 0,
                pdf: event.files?.length || 0,
                questions: event.questions?.length || event.questionsConfig?.questions?.length || 0 
            }
        });

        // 1. Split Overdue Goals (Priority Logic)
        const spacedReviews = overdue.filter(ev => 
            ev.type === 'review' && (!!ev.originalEventId || (ev.reviewLabel && ev.reviewLabel.startsWith('REV.')))
        ).map(mapToGoal);

        const generalOverdue = overdue.filter(ev => {
            const isSpaced = ev.type === 'review' && (!!ev.originalEventId || (ev.reviewLabel && ev.reviewLabel.startsWith('REV.')));
            return !isSpaced;
        }).map(mapToGoal);
        
        setOverdueReviews(spacedReviews);
        setOverdueGeneral(generalOverdue);

        // 2. Today Goals (Ordered)
        const mappedToday = today.map(mapToGoal);
        const spacedReviewsToday = mappedToday.filter(item => item.isSpacedReview);
        const normalTasksToday = mappedToday.filter(item => !item.isSpacedReview);
        const sortedToday = [...spacedReviewsToday, ...normalTasksToday];
        setTodayGoals(sortedToday);

        // 3. CALCULATE SIMULADOS
        if (planId) {
            await calculateSimuladosStatus(currentUser.uid, planId);
        }

    } catch (error) {
        console.error("Erro ao carregar cronograma:", error);
    } finally {
        setLoading(false);
    }
  };

  // --- 2. MOTOR DE CÁLCULO DE REQUISITOS (LÓGICA FORNECIDA) ---
  const calculateSimuladosStatus = async (uid: string, planId: string) => {
      try {
          // A. Fetch Full Plan (Cycles and Content)
          const fullPlan = await fetchFullPlanData(planId);
          if (!fullPlan || !fullPlan.cycles) return;

          // B. Busca Metas Concluídas (Progress)
          // Isso inclui tanto as marcadas no calendário quanto as manuais
          const completedIdsSet = await getStudentCompletedMetas(uid, planId);

          // C. Sincroniza desbloqueios pendentes
          await checkAndUnlockSimulados(uid, planId, undefined, fullPlan, completedIdsSet);

          // D. Busca o que já está AGENDADO (Futuro) para exibir na lista
          // CORREÇÃO AQUI: Usa data local e filtragem em memória para contornar limitações do Firestore
          const todayStr = getLocalISODate(new Date());
          const schedulesRef = collection(db, 'users', uid, 'schedules');
          const snapScheduled = await getDocs(schedulesRef);
          
          // Map of MetaId -> Schedule Data
          const scheduledMap = new Map<string, any>();
          
          snapScheduled.docs.forEach(doc => {
              const data = doc.data();
              const docDate = data.date;
              if (docDate < todayStr) return;

              const items = data.items || [];
              items.forEach((item: any) => {
                  if (item.planId === planId && item.type === 'simulado' && item.status !== 'completed') {
                      const mId = item.metaId || item.taskId;
                      if (mId) {
                        scheduledMap.set(mId, { 
                            date: data.date, // 'YYYY-MM-DD'
                            ...item 
                        });
                      }
                  }
              });
          });

          // D. Fetch Real Exam Details (Duration) if linked class exists
          const realExamDetails: Record<string, any> = {};
          if (fullPlan.linkedSimuladoClassId) {
              try {
                  const exams = await getExams(fullPlan.linkedSimuladoClassId);
                  exams.forEach(exam => {
                      if (exam.id) realExamDetails[exam.id] = exam;
                  });
              } catch (e) {
                  console.warn("Could not fetch exams for linked class", e);
              }
          }

          // E. Fetch Unlocked Simulados (Triggered by backend)
          const unlockedRef = collection(db, 'users', uid, 'unlockedSimulados');
          const snapUnlocked = await getDocs(unlockedRef);
          const unlockedIdsSet = new Set(snapUnlocked.docs.map(doc => doc.id));

          const blocked: ComputedSimulado[] = [];
          const released: ComputedSimulado[] = [];
          const scheduledList: ComputedSimulado[] = [];

          // Varredura Sequencial do Plano
          fullPlan.cycles.forEach((cycle: any, cIdx: number) => {
              if (!cycle.items) return;

              cycle.items.forEach((item: any, iIdx: number) => {
                  
                  // CASO 1: É UM SIMULADO
                  if (item.type === 'simulado') {
                      const metaId = item.id; 
                      // referenceId usually points to exam ID in simulatedClasses
                      const examId = item.referenceId; 

                      // Tenta pegar do cache 'realExamDetails' (banco real), senão do item, senão padrão
                      const realData = realExamDetails[examId];
                      const realDuration = realData?.duration ? Number(realData.duration) : (item.duration ? Number(item.duration) : 240);
                      const realTitle = realData?.title || item.simuladoTitle || 'Simulado Oficial';
                      // EXTRAÇÃO DO PDF (FIX)
                      const realBookletUrl = realData?.files?.bookletUrl;

                      // Check if completed
                      const isDone = completedIdsSet.has(metaId);
                      
                      if (isDone) return; // Don't show completed in this dashboard section

                      // Check if scheduled
                      const scheduledItem = scheduledMap.get(metaId);

                      // Check if Unlocked (Source of Truth from Backend)
                      const isUnlocked = unlockedIdsSet.has(metaId);

                      const simuladoObj: ComputedSimulado = {
                          id: metaId, 
                          title: realTitle,
                          duration: realDuration,
                          status: 'blocked', // Default
                          cycleIndex: cIdx,
                          cycleName: cycle.name || `Ciclo ${cIdx + 1}`,
                          itemIndex: iIdx,
                          bookletUrl: realBookletUrl // Passando a URL para o componente
                      };

                      if (scheduledItem) {
                          // Is Scheduled
                          simuladoObj.status = 'scheduled';
                          // Parse Date
                          const [y, m, d] = scheduledItem.date.split('-').map(Number);
                          simuladoObj.date = new Date(y, m - 1, d);
                          
                          scheduledList.push(simuladoObj);
                      } else if (isUnlocked) {
                          // Is Released
                          simuladoObj.status = 'released';
                          released.push(simuladoObj);
                      } else {
                          // Is Blocked
                          simuladoObj.status = 'blocked';
                          blocked.push(simuladoObj);
                      }
                  } 
              });
          });

          // Update State
          setComputedSimulados({ 
              blocked, 
              released,
              scheduled: scheduledList
          });

      } catch (error) {
          console.error("Erro calc simulados:", error);
      }
  };

  const handleScheduleSimuladoConfirm = async () => {
      if (!showScheduleModal || !currentUser || !currentPlanId || !simuladoDate) return;

      const simuladoToSchedule = computedSimulados.released.find(s => s.id === showScheduleModal);
      if (!simuladoToSchedule) return;

      try {
          const dateObj = new Date(simuladoDate);
          // Adjust timezone to prevent day shift
          const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
          const adjustedDate = new Date(dateObj.getTime() + userTimezoneOffset);

          // PASSA O OBJETO COMPLETO DE DADOS PARA A NOVA ASSINATURA (Incluindo bookletUrl)
          await scheduleUserSimulado(
              currentUser.uid, 
              currentPlanId, 
              simuladoToSchedule, // { id, title, duration, bookletUrl, ... }
              adjustedDate
          );
          
          alert("Simulado agendado com sucesso!");
          setShowScheduleModal(null);
          setSimuladoDate('');
          fetchSchedule(); // Refresh all
      } catch (error) {
          console.error("Erro ao agendar:", error);
          alert("Erro ao agendar simulado.");
      }
  };

  useEffect(() => {
    fetchSchedule();
  }, [currentUser]);

  // Reactive listener for unlocked simulados
  useEffect(() => {
    if (!currentUser || !currentPlanId) return;
    const unlockedRef = collection(db, 'users', currentUser.uid, 'unlockedSimulados');
    const q = query(unlockedRef, where('planId', '==', currentPlanId));
    const unsubscribe = onSnapshot(q, () => {
      // Re-calculate only simulados status when the collection changes
      calculateSimuladosStatus(currentUser.uid, currentPlanId);
    });
    return () => unsubscribe();
  }, [currentUser, currentPlanId]);

  // Handler INICIAL para iniciar Simulado (Abre POPUP DE CONFIRMAÇÃO)
  const handleStartSimulado = (goal: StudentGoal) => {
      setExamToConfirm(goal);
  };

  // Handler DEFINITIVO após confirmar (Abre Modo Foco)
  const handleConfirmStart = () => {
      if (examToConfirm) {
          setActiveSimulado(examToConfirm);
          setIsExamMode(true);
          setExamToConfirm(null);
      }
  };

  // Handler para completar Simulado (Fecha Modo Foco e Atualiza)
  const handleCompleteSimulado = async () => {
      if (!activeSimulado || !currentUser || !currentPlanId) return;
      try {
          // Atualiza status no banco (usando helper existente)
          await toggleGoalStatus(currentUser.uid, currentPlanId, activeSimulado.id, 'pending');
          
          // Atualiza UI local
          setTodayGoals(prev => prev.map(g => 
              g.id === activeSimulado.id ? { ...g, isCompleted: true } : g
          ));
          
          setIsExamMode(false);
          setActiveSimulado(null);
      } catch (error) {
          console.error("Erro ao concluir simulado:", error);
          alert("Erro ao salvar progresso.");
      }
  };

  const checkAndTriggerAnticipation = async (updatedGoals: any[]) => {
    if (!currentUser) return;
    const pendingGoals = updatedGoals.filter(g => !g.isCompleted);
    if (pendingGoals.length === 0) {
      const config = await getStudentConfig(currentUser.uid);
      const safeRoutine = config?.routine || [0, 0, 0, 0, 0, 0, 0];
      
      // 1. Calcula o tempo gasto apenas com cronômetro (conclusão manual = 0)
      const timeSpentToday = updatedGoals.reduce((acc, goal) => {
        return acc + (goal.recordedMinutes || 0); // Ajuste para a propriedade que salva o tempo do cronômetro
      }, 0);

      // 2. Calcula tempo da rotina restante
      const todayDayIndex = new Date().getDay();
      const dailyCapacity = safeRoutine[todayDayIndex] || 0;
      const routineTimeLeft = Math.max(0, dailyCapacity - timeSpentToday);

      // 3. Calcula tempo físico do relógio (até 23:59)
      const now = new Date();
      const realTimeLeft = (23 * 60 + 59) - (now.getHours() * 60 + now.getMinutes());

      // 4. Variável final (o menor entre os dois)
      const finalTimeAvailable = Math.min(routineTimeLeft, realTimeLeft);

      if (finalTimeAvailable > 0) {
        setAvailableTimeForAnticipation(finalTimeAvailable);
        setShowAnticipateModal(true);
      }
    }
  };

  const handleConfirmAnticipation = async () => {
      if (!currentUser || !currentPlanId) return;
      setIsAnticipating(true);
      try {
          const config = await getStudentConfig(currentUser.uid);
          const safeRoutine = config?.routine || [0, 0, 0, 0, 0, 0, 0];
          const todayStr = getLocalISODate(new Date());

          const result = await anticipateAndShiftGoals(
              currentUser.uid,
              currentPlanId,
              safeRoutine,
              availableTimeForAnticipation,
              todayStr
          );
          
          if (result.success) {
              await fetchSchedule(); 
              toast.success(`${result.anticipatedCount} meta(s) antecipada(s) com sucesso!`);
          } else {
              toast(result.message || 'A próxima meta não se enquadra no tempo livre de hoje.');
          }
      } catch (error) {
          console.error(error);
          toast.error('Erro ao antecipar metas.');
      } finally {
          setIsAnticipating(false);
          setShowAnticipateModal(false);
      }
  };

  const getFormattedDate = () => {
    const date = new Date();
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const dayAndMonth = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    return { weekday, dayAndMonth };
  };

  const { weekday, dayAndMonth } = getFormattedDate();

  const handleToggleComplete = async (goalToToggle: StudentGoal) => {
    // 1. Encontra o estado ATUAL da meta na lista (antes da alteração)
    const currentGoal = todayGoals.find(g => g.id === goalToToggle.id) ||
                        overdueReviews.find(g => g.id === goalToToggle.id) ||
                        overdueGeneral.find(g => g.id === goalToToggle.id);
    
    if (!currentGoal) return;

    // 2. Determina o Status ALVO (Target)
    let targetStatusBoolean: boolean;

    // Lógica Inteligente:
    // Se o objeto 'goalToToggle' que veio do componente filho (Card) tem um status DIFERENTE do que está na lista atual,
    // significa que o componente filho (ex: Timer) está FORÇANDO um novo estado (ex: completou).
    if (goalToToggle.isCompleted !== currentGoal.isCompleted) {
        targetStatusBoolean = goalToToggle.isCompleted;
    } else {
        // Se são iguais, é um clique manual de alternância (Toggle)
        targetStatusBoolean = !currentGoal.isCompleted;
    }

    const targetStatusString = targetStatusBoolean ? 'completed' : 'pending';

    // 3. Atualização Otimista na UI (Refletindo o Target)
    const toggleInList = (list: StudentGoal[]) => list.map(g => 
        g.id === goalToToggle.id 
          ? { ...g, ...goalToToggle, isCompleted: targetStatusBoolean } // Merge seguro
          : g
    );
    
    let novaListaDeMetasAtualizada = todayGoals;

    if (todayGoals.some(g => g.id === goalToToggle.id)) {
        novaListaDeMetasAtualizada = toggleInList(todayGoals);
        setTodayGoals(novaListaDeMetasAtualizada);
    }
    else if (overdueReviews.some(g => g.id === goalToToggle.id)) setOverdueReviews(toggleInList(overdueReviews));
    else if (overdueGeneral.some(g => g.id === goalToToggle.id)) setOverdueGeneral(toggleInList(overdueGeneral));

    // 4. Persistência no Backend com Status Explícito
    if (currentUser && currentPlanId) {
        await toggleGoalStatus(
            currentUser.uid, 
            currentPlanId, 
            goalToToggle.id, 
            currentGoal.isCompleted ? 'completed' : 'pending', // Status atual (para ref)
            true, // isManual flag
            targetStatusString // <--- O NOVO PARÂMETRO QUE IMPEDE A INVERSÃO
        );
        
        if (todayGoals.some(g => g.id === goalToToggle.id) && targetStatusBoolean) {
            checkAndTriggerAnticipation(novaListaDeMetasAtualizada);
        }
    }
  };

  const handleReschedule = async () => {
    if (!currentUser || !currentPlanId) return;
    setIsRescheduling(true);
    try {
        const config = await getStudentConfig(currentUser.uid);
        if (config && config.routine) {
            await rescheduleOverdueTasks(currentUser.uid, currentPlanId, config.routine);
            await fetchSchedule(); 
            setShowRescheduleModal(false);
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao replanejar.");
    } finally {
        setIsRescheduling(false);
    }
  };

  const completedTodayCount = todayGoals.filter(g => g.isCompleted).length;
  const totalTodayCount = todayGoals.length;
  const progress = totalTodayCount > 0 ? (completedTodayCount / totalTodayCount) * 100 : 0;

  // --- RENDERIZAÇÃO DA ABA DE MENTORIA ---
  if (currentTab === 'mentorship') {
      return (
          <StudentMentorshipViewer planId={currentPlanId} />
      );
  }

  if (loading && !isRescheduling) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <Loader2 size={40} className="animate-spin text-brand-red" />
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Carregando cronograma...</p>
          </div>
      );
  }

  return (
    <div className="pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* OVERLAY MODO FOCO (COM ACESSO AO PDF CORRIGIDO) */}
      {isExamMode && activeSimulado && (
          <SimuladoFocusMode 
              simulado={{
                  id: (activeSimulado as any).docId || activeSimulado.id,
                  title: activeSimulado.title,
                  duration: activeSimulado.duration || 240, // Em minutos
                  
                  // CORREÇÃO DEFINITIVA: Fallback em cascata (Procura a URL em todos os lugares possíveis)
                  pdfUrl: activeSimulado.files?.[0]?.url || 
                          (activeSimulado as any).pdfUrl || 
                          (activeSimulado as any).bookletUrl || 
                          (activeSimulado as any).arquivoProvaUrl
              }}
              onClose={() => setIsExamMode(false)}
              onComplete={handleCompleteSimulado}
          />
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none mb-2">
            Hoje
          </h1>
          <div className="flex flex-col">
            <span className="text-sm md:text-base font-black text-zinc-500 uppercase tracking-widest">
              {weekday}
            </span>
            <span className="text-xl md:text-2xl font-black text-brand-red uppercase tracking-tighter">
              {dayAndMonth}
            </span>
          </div>
        </div>

        {/* Progress Summary */}
        {totalTodayCount > 0 && (
            <div className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                <div className="relative w-12 h-12">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-zinc-800" />
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-brand-red" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * progress) / 100} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">
                        {Math.round(progress)}%
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl font-black text-white leading-none">
                        {completedTodayCount}<span className="text-zinc-600 text-lg">/{totalTodayCount}</span>
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Metas Concluídas
                    </span>
                </div>
            </div>
        )}
      </div>

      {/* --- SEÇÃO 1: REVISÕES ESPAÇADAS --- */}
      <section className="mb-4">
        <div className={`rounded-2xl border overflow-hidden transition-all ${
            overdueReviews.length > 0 
                ? 'bg-red-950/20 border-red-500/40' 
                : 'bg-emerald-950/20 border-emerald-500/30'
        }`}>
            <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${overdueReviews.length > 0 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-emerald-500/20 text-emerald-500'}`}>
                        {overdueReviews.length > 0 ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                    </div>
                    <div>
                        <h3 className={`text-lg font-black uppercase tracking-tighter ${overdueReviews.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {overdueReviews.length > 0 ? 'REVISÕES EM ATRASO' : 'REVISÕES EM DIA'}
                        </h3>
                        <p className={`text-xs font-medium ${overdueReviews.length > 0 ? 'text-red-400/80' : 'text-emerald-400/80'}`}>
                            {overdueReviews.length > 0 
                                ? `${overdueReviews.length} revisões precisam de atenção imediata.` 
                                : 'Parabéns! Sua curva de esquecimento está sob controle.'}
                        </p>
                    </div>
                </div>

                {overdueReviews.length > 0 && (
                    <button 
                        onClick={() => setShowRescheduleModal(true)}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-900/20 transition-all flex items-center gap-2 hover:scale-105"
                    >
                        <RefreshCw size={12} /> Replanejar Revisões
                    </button>
                )}
            </div>

            {/* List Body (Only if overdue) */}
            {overdueReviews.length > 0 && (
                <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {overdueReviews.map(goal => (
                        <StudentGoalCard 
                            key={goal.id} 
                            goal={goal} 
                            onToggleComplete={(g) => handleToggleComplete(g)}
                            onRefresh={fetchSchedule} 
                        />
                    ))}
                </div>
            )}
        </div>
      </section>

      {/* --- SEÇÃO 2: OUTRAS METAS EM ATRASO --- */}
      <section className="mb-12">
        <div className={`rounded-2xl border overflow-hidden transition-all ${
            overdueGeneral.length > 0 
                ? 'bg-red-950/20 border-red-500/40' 
                : 'bg-emerald-950/20 border-emerald-500/30'
        }`}>
            <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${overdueGeneral.length > 0 ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                        {overdueGeneral.length > 0 ? <Clock size={24} /> : <ShieldCheck size={24} />}
                    </div>
                    <div>
                        <h3 className={`text-lg font-black uppercase tracking-tighter ${overdueGeneral.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {overdueGeneral.length > 0 ? 'METAS EM ATRASO' : 'SEM ATRASOS GERAIS'}
                        </h3>
                        <p className={`text-xs font-medium ${overdueGeneral.length > 0 ? 'text-red-400/80' : 'text-emerald-400/80'}`}>
                            {overdueGeneral.length > 0 
                                ? `Você possui ${overdueGeneral.length} tarefas acumuladas.` 
                                : 'Excelente! Você está rigorosamente em dia com o cronograma.'}
                        </p>
                    </div>
                </div>
                
                {overdueGeneral.length > 0 && (
                    <button 
                        onClick={() => setShowRescheduleModal(true)}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-red-900/20"
                    >
                        <RefreshCw size={14} /> Replanejar Atrasos
                    </button>
                )}
            </div>
            
            {/* List Body (Only if overdue) */}
            {overdueGeneral.length > 0 && (
                <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {overdueGeneral.map(goal => (
                        <StudentGoalCard 
                            key={goal.id} 
                            goal={goal} 
                            onToggleComplete={(g) => handleToggleComplete(g)}
                            onRefresh={fetchSchedule} 
                        />
                    ))}
                </div>
            )}
        </div>
      </section>

      {/* SEÇÃO 3: METAS DE HOJE */}
      <section>
        <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <LayoutDashboard size={16} /> Metas Agendadas Para Hoje
        </h3>

        {todayGoals.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
                <div className="mb-4 p-4 rounded-full bg-zinc-900 border border-zinc-800">
                    <Coffee size={32} className="text-zinc-500" />
                </div>
                <h3 className="text-lg font-black uppercase text-zinc-400 tracking-tight">Tudo Limpo!</h3>
                <p className="text-xs font-medium text-zinc-500 max-w-xs text-center mt-1">
                    Você não tem mais metas para hoje.
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {todayGoals.map((goal) => (
                    <StudentGoalCard 
                        key={goal.id} 
                        goal={goal} 
                        onToggleComplete={(g) => handleToggleComplete(g)}
                        onRefresh={fetchSchedule}
                        // --- CORREÇÃO CIRÚRGICA AQUI ---
                        // Só passa a função de iniciar simulado SE o tipo for 'simulado'.
                        // Caso contrário, passa undefined, e o card usa apenas o timer padrão.
                        onStart={goal.type === 'simulado' ? handleStartSimulado : undefined}
                    />
                ))}
            </div>
        )}
      </section>

      {/* --- SEÇÃO DE SIMULADOS (NOVO) --- */}
      {computedSimulados.scheduled.length > 0 && (
          <section className="mt-12 mb-10 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-green-500 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-green-500" />
                      SIMULADOS AGENDADOS
                  </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {computedSimulados.scheduled.map(sim => (
                      <SimuladoDashboardCard 
                          key={sim.id} 
                          simulado={sim} 
                      />
                  ))}
              </div>
          </section>
      )}

      {(computedSimulados.released.length > 0 || computedSimulados.blocked.length > 0) && (
          <section className="mt-12 mb-10 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Trophy size={14} className="text-zinc-400" />
                      SIMULADOS
                  </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {computedSimulados.released.map(sim => (
                      <SimuladoDashboardCard 
                          key={sim.id} 
                          simulado={sim} 
                          onSchedule={(id) => setShowScheduleModal(id)} 
                      />
                  ))}
                  {computedSimulados.blocked.map(sim => (
                      <SimuladoDashboardCard 
                          key={sim.id} 
                          simulado={sim} 
                      />
                  ))}
              </div>
          </section>
      )}

      {/* MODAL DE AGENDAMENTO DE SIMULADO */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">Agendar Simulado</h3>
                    <button onClick={() => setShowScheduleModal(null)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Escolha a Data</label>
                        <input 
                            type="date" 
                            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl p-3 focus:outline-none focus:border-brand-red font-mono uppercase"
                            value={simuladoDate}
                            onChange={(e) => setSimuladoDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]} // Min Today
                        />
                        <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                            Este simulado ocupará o dia inteiro no seu cronograma. Outras metas deste dia serão empurradas para frente.
                        </p>
                    </div>

                    <button 
                        onClick={handleScheduleSimuladoConfirm}
                        disabled={!simuladoDate}
                        className="w-full py-3 bg-brand-red hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirmar Agendamento
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* SOLICITAÇÃO 2: POPUP DE CONFIRMAÇÃO DE INÍCIO */}
      {examToConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#1a1d24] p-8 rounded-2xl w-full max-w-lg border border-red-600/30 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center mb-6 text-red-500 border border-red-500/20">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-white font-black text-2xl uppercase mb-2">Atenção!</h3>
                    <p className="text-gray-300 text-sm leading-relaxed mb-6">
                        Você está prestes a iniciar o simulado <strong>{examToConfirm.title}</strong>.
                        <br/><br/>
                        <span className="text-red-400 font-bold block bg-red-900/10 p-2 rounded">
                            O cronômetro iniciará imediatamente e NÃO poderá ser pausado.
                        </span>
                    </p>
                    
                    <div className="flex flex-col w-full gap-3">
                        <button 
                            onClick={handleConfirmStart}
                            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black text-sm rounded-xl uppercase tracking-wider transition-all shadow-lg"
                        >
                            Estou pronto, Iniciar Agora
                        </button>
                        <button 
                            onClick={() => setExamToConfirm(null)}
                            className="w-full py-3 bg-transparent border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white font-bold text-sm rounded-xl uppercase tracking-wider transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO REPLANEJAMENTO */}
      <ConfirmationModal 
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        onConfirm={handleReschedule}
        title="Replanejar Pendências?"
        message="Atenção: Isso moverá TODAS as metas atrasadas (incluindo revisões) para hoje, empurrando o restante do cronograma para frente (Efeito Dominó). As revisões terão prioridade na nova agenda."
        confirmText="Sim, Reorganizar Agenda"
        variant="primary"
        isLoading={isRescheduling}
      />

      {/* MODAL DE ANTECIPAÇÃO (CELEBRAÇÃO) */}
      {showAnticipateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#111111] border border-emerald-500/30 rounded-xl p-6 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Parabéns! Missão do dia cumprida.</h3>
            <p className="text-gray-400 mb-6">
              Você ainda possui <strong className="text-emerald-500">{availableTimeForAnticipation} minutos</strong> livres de estudos hoje. Deseja antecipar metas para hoje?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowAnticipateModal(false)}
                className="flex-1 py-3 px-4 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-700 transition"
              >
                Encerrar por Hoje
              </button>
              <button 
                onClick={handleConfirmAnticipation}
                disabled={isAnticipating}
                className="flex-1 py-3 px-4 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition disabled:opacity-50"
              >
                {isAnticipating ? 'Antecipando...' : 'Sim, Antecipar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentDashboard;
