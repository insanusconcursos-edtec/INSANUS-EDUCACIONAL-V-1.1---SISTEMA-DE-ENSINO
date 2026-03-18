import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, VideoOff, FileText } from 'lucide-react';
import { doc, onSnapshot, getDoc, collection } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { LiveEvent, LiveActiveUser } from '../../../types/liveEvent';
import { useAuth } from '../../../contexts/AuthContext';
import { StudentLiveChat } from '../../../components/student/lives/room/StudentLiveChat';
import { StudentLiveWaitingRoom } from '../../../components/student/lives/room/StudentLiveWaitingRoom';
import { AdminLivePlayer } from '../../../components/admin/liveEvents/room/AdminLivePlayer';
import { StudentLiveRecording } from '../../../components/student/lives/room/StudentLiveRecording';
import { joinLiveEvent, leaveLiveEvent } from '../../../services/liveChatService';

export const StudentLiveEventRoom: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentUser, userData, loading: authLoading } = useAuth();
  
  const [event, setEvent] = useState<LiveEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [userIsolatedProducts, setUserIsolatedProducts] = useState<string[]>([]);
  const [viewerCount, setViewerCount] = useState(0);

  const formatShortName = (fullName?: string | null) => {
    if (!fullName) return 'Aluno';
    const nameParts = fullName.trim().split(' ');
    return nameParts.slice(0, 2).join(' '); // Pega apenas o 1º e 2º nome
  };

  const resolvedName = formatShortName(userData?.name || currentUser?.displayName || currentUser?.email);

  // Heartbeat de Presença
  useEffect(() => {
    // A Trava: Bloqueia a execução se o contexto ainda estiver carregando os dados do Firestore
    if (authLoading || !currentUser || !eventId) return;

    const userPresence = {
      uid: currentUser.uid,
      name: resolvedName,
      email: currentUser.email || userData?.email || '',
      photoUrl: userData?.photoUrl || currentUser.photoURL || ''
    };

    joinLiveEvent(eventId, userPresence);

    return () => {
      leaveLiveEvent(eventId, currentUser.uid);
    };
  }, [eventId, currentUser, resolvedName, userData, authLoading]);

  // Listener de Usuários Online e Contagem
  useEffect(() => {
    if (!eventId) return;

    const presenceRef = collection(db, 'live_events', eventId, 'presence');
    const unsubscribe = onSnapshot(presenceRef, (snapshot) => {
      setViewerCount(snapshot.size);
    }, (error) => {
      console.error("Error listening to presence:", error);
    });

    return () => unsubscribe();
  }, [eventId]);

  useEffect(() => {
    if (!currentUser) return;
    const loadUserAccess = async () => {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const isolated = userData?.access
          ?.filter((item: any) => item.type === 'isolated_product' && item.isActive)
          .map((item: any) => item.targetId) || [];
        setUserIsolatedProducts(isolated);
      }
    };
    loadUserAccess();
  }, [currentUser]);

  useEffect(() => {
    if (!eventId || !currentUser) return;

    // Listen to event changes in real-time
    const eventRef = doc(db, 'live_events', eventId);
    const unsubscribe = onSnapshot(eventRef, (docSnap) => {
      if (docSnap.exists()) {
        setEvent({ id: docSnap.id, ...docSnap.data() } as LiveEvent);
      } else {
        setEvent(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error listening to event:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [eventId, currentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-red"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-zinc-400">
        <VideoOff size={48} className="mb-4 opacity-20" />
        <h2 className="text-xl font-bold text-white mb-2">Evento não encontrado</h2>
        <button 
          onClick={() => navigate('/app/eventos-ao-vivo')}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors mt-4"
        >
          Voltar para a lista
        </button>
      </div>
    );
  }

  if (event.status === 'ended') {
    // Se o usuário possui como produto isolado, mostra a Gravação
    if (event.isIsolatedProduct && userIsolatedProducts.includes(event.id)) {
      return (
         <div className="max-w-7xl mx-auto py-6">
            <h1 className="text-2xl font-bold text-white mb-6 px-4">{event.title} - GRAVAÇÃO</h1>
            <StudentLiveRecording event={event} />
         </div>
      );
    }
    
    // Aluno comum (sem produto isolado)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Evento Encerrado</h2>
          <p className="text-gray-400">Esta transmissão ao vivo já foi finalizada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-zinc-950 p-3 lg:p-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/app/eventos-ao-vivo')}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white uppercase tracking-tight">{event.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${event.status === 'live' ? 'bg-brand-red animate-pulse' : event.status === 'scheduled' ? 'bg-blue-500' : 'bg-zinc-500'}`}></span>
                <span className="text-xs font-medium text-zinc-400">
                  {event.status === 'live' ? 'AO VIVO' : event.status === 'scheduled' ? 'AGENDADO' : 'ENCERRADO'}
                </span>
              </div>
              
              {event.showViewers && event.status === 'live' && (
                <>
                  <div className="w-1 h-1 bg-zinc-700 rounded-full"></div>
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Users size={12} />
                    <span>{viewerCount} assistindo</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Column: Video Player */}
        <div className="w-full lg:w-2/3 xl:w-3/4 flex flex-col bg-black overflow-hidden lg:overflow-y-auto shrink-0 lg:shrink">
          <div className="w-full aspect-video bg-zinc-950 border-b border-zinc-800 flex items-center justify-center p-1 lg:p-6 shrink-0">
            {event.status === 'scheduled' && (
              <StudentLiveWaitingRoom 
                thumbnailUrl={event.thumbnailUrl} 
                eventDate={event.eventDate} 
                startTime={event.startTime} 
              />
            )}
            
            {event.status === 'live' && (
              <AdminLivePlayer event={event} />
            )}
            
            {event.status === 'ended' && (
              <div className="flex flex-col items-center justify-center text-center p-8 bg-zinc-900/50 rounded-2xl border border-zinc-800 w-full h-full">
                <VideoOff size={48} className="text-zinc-600 mb-4" />
                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Evento Encerrado</h2>
                <p className="text-zinc-400">A transmissão ao vivo já terminou.</p>
              </div>
            )}
          </div>

          {/* Materials Section - Hidden on mobile to prioritize player and chat if they don't fit, or scrollable on desktop */}
          {event.materials && event.materials.length > 0 && (
            <div className="hidden lg:block p-6 bg-zinc-950">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText size={20} className="text-brand-red" />
                Materiais de Apoio
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {event.materials.map((material) => (
                  <a
                    key={material.id}
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors flex items-start gap-3 group"
                  >
                    <div className="p-2 bg-zinc-800 rounded-lg shrink-0 group-hover:bg-zinc-700 transition-colors">
                      <FileText size={20} className="text-zinc-300" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-white font-medium truncate text-sm" title={material.title}>
                        {material.title}
                      </h4>
                      <span className="text-xs text-brand-red mt-1 inline-block">Baixar arquivo</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Chat */}
        <div className="w-full lg:w-1/3 xl:w-1/4 bg-zinc-950 flex flex-col flex-1 lg:h-auto border-t lg:border-t-0 lg:border-l border-zinc-800 overflow-hidden">
          {event.isChatEnabled ? (
            <StudentLiveChat eventId={event.id} status={event.status} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                <VideoOff size={24} className="text-zinc-500" />
              </div>
              <h3 className="text-white font-bold mb-2">Chat Desativado</h3>
              <p className="text-zinc-500 text-sm">O chat não está disponível para este evento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
