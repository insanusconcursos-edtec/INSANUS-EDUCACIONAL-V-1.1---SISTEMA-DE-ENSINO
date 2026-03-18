import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, MessageCircle } from 'lucide-react';
import { liveChatService } from '../../../../services/liveChatService';
import { LiveChatMessage } from '../../../../types/liveEvent';
import { useAuth } from '../../../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface StudentLiveChatProps {
  eventId: string;
  status: 'scheduled' | 'live' | 'ended';
}

export const StudentLiveChat: React.FC<StudentLiveChatProps> = ({ eventId, status }) => {
  const { currentUser, userData } = useAuth();
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formatShortName = (fullName?: string | null) => {
    if (!fullName) return 'Aluno';
    const nameParts = fullName.trim().split(' ');
    return nameParts.slice(0, 2).join(' '); // Pega apenas o 1º e 2º nome
  };

  const resolvedName = formatShortName(userData?.name || currentUser?.displayName);

  useEffect(() => {
    if (!eventId) return;

    const unsubscribe = liveChatService.subscribeToMessages(eventId, (msgs) => {
      setMessages(msgs);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [eventId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || isSending || status !== 'live') return;

    setIsSending(true);
    try {
      await liveChatService.sendMessage(eventId, {
        userId: currentUser.uid,
        userName: resolvedName,
        senderName: resolvedName,
        userEmail: currentUser.email || userData?.email || '',
        userPhoto: userData?.photoUrl || currentUser.photoURL || null,
        senderPhoto: userData?.photoUrl || currentUser.photoURL || null,
        text: newMessage.trim(),
        isAdmin: false
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await liveChatService.deleteMessage(eventId, messageId);
      toast.success("Mensagem apagada.");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Erro ao apagar mensagem.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-zinc-400" />
          <h2 className="font-bold text-white text-sm uppercase tracking-wider">Chat ao Vivo</h2>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-center">
            <MessageCircle size={32} className="mb-3 opacity-20" />
            <p className="text-sm">Nenhuma mensagem enviada.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = currentUser?.uid === msg.userId;
            const isAdmin = msg.isAdmin;

            return (
              <div key={msg.id} className={`group flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-2 mb-1 w-full ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className={`text-[10px] font-bold ${isAdmin ? 'text-red-500' : isMine ? 'text-brand-red' : 'text-zinc-400'}`}>
                    {isAdmin ? 'MODERADOR' : isMine ? 'VOCÊ' : (msg.senderName || msg.userName || 'Aluno')}
                  </span>
                  <span className="text-[9px] text-zinc-600">
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                  
                  {!msg.isDeleted && isMine && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-500 transition-all"
                      title="Apagar mensagem"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                
                <div className={`max-w-[90%] rounded-2xl px-3 py-2 ${
                  msg.isDeleted 
                    ? 'bg-zinc-800/30 text-zinc-600 italic border border-zinc-800/50' 
                    : isAdmin
                      ? 'bg-red-600/10 border border-red-500/20 text-white'
                      : isMine
                        ? 'bg-brand-red/10 border border-brand-red/20 text-white'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
                }`}>
                  <p className="text-sm break-words">
                    {msg.isDeleted ? 'Mensagem apagada' : msg.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-zinc-900 border-t border-zinc-800 shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={status === 'scheduled' ? "O chat será liberado quando o evento iniciar" : "Digite sua mensagem..."}
            disabled={status !== 'live' || isSending}
            className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-red transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || isSending || status !== 'live'} 
            className="px-3 py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
