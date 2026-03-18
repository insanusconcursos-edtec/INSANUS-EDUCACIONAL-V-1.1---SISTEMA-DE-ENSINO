import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, ShieldAlert, Edit2, Check, X } from 'lucide-react';
import { liveChatService } from '../../../../services/liveChatService';
import { LiveChatMessage } from '../../../../types/liveEvent';
import { useAuth } from '../../../../contexts/AuthContext';
import { ConfirmationModal } from '../../ui/ConfirmationModal';
import toast from 'react-hot-toast';

interface AdminLiveChatProps {
  eventId: string;
}

export const AdminLiveChat: React.FC<AdminLiveChatProps> = ({ eventId }) => {
  const { currentUser, userData } = useAuth();
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formatShortName = (fullName?: string | null) => {
    if (!fullName) return 'Administrador';
    const nameParts = fullName.trim().split(' ');
    return nameParts.slice(0, 2).join(' '); // Pega apenas o 1º e 2º nome
  };

  const resolvedName = formatShortName(userData?.name || currentUser?.displayName);

  const handleEditSubmit = async (messageId: string) => {
    if (!editText.trim()) return;
    try {
      await liveChatService.editMessage(eventId, messageId, editText);
      setEditingMessageId(null);
      setEditText('');
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error("Erro ao editar mensagem.");
    }
  };

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
    if (!newMessage.trim() || !currentUser || isSending) return;

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
        isAdmin: true
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    try {
      await liveChatService.deleteMessage(eventId, messageToDelete);
      toast.success("Mensagem apagada.");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Erro ao apagar mensagem.");
    } finally {
      setMessageToDelete(null);
    }
  };

  const handleClearChat = async () => {
    setIsClearing(true);
    try {
      await liveChatService.clearChat(eventId);
      toast.success("Chat limpo.");
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Erro ao limpar chat.");
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-red-500" />
          <h2 className="font-bold text-white text-sm uppercase tracking-wider">Moderação de Chat</h2>
        </div>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
        >
          Limpar Chat
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-center">
            <ShieldAlert size={32} className="mb-3 opacity-20" />
            <p className="text-sm">Nenhuma mensagem enviada.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.isAdmin;

            return (
              <div key={msg.id} className="group flex flex-col items-start">
                <div className={`max-w-[90%] w-full rounded-2xl px-3 py-2 ${
                  isAdmin
                    ? 'bg-red-600/10 border border-red-500/20 text-white'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${isAdmin ? 'text-red-500' : 'text-zinc-400'}`}>
                          {isAdmin ? 'MODERADOR' : (msg.senderName || msg.userName || 'Aluno')}
                        </span>
                        <span className="text-[9px] text-zinc-600">
                          {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      
                      {/* Botões de Ação (Apenas para o Administrador) */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Botão de Editar (Apenas para mensagens do próprio Admin) */}
                        {msg.userId === currentUser?.uid && (
                          <button 
                            onClick={() => { setEditingMessageId(msg.id); setEditText(msg.text); }}
                            className="text-zinc-500 hover:text-blue-400 transition"
                            title="Editar mensagem"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                        {/* Botão de Apagar (Admin pode apagar QUALQUER mensagem agora) */}
                        <button 
                          onClick={() => setMessageToDelete(msg.id)}
                          className="text-zinc-500 hover:text-red-500 transition"
                          title="Apagar mensagem"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Lógica de Exibição ou Edição de Texto */}
                    {editingMessageId === msg.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input 
                          type="text" 
                          value={editText} 
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 bg-black border border-zinc-800 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-red-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit(msg.id)}
                          autoFocus
                        />
                        <button onClick={() => handleEditSubmit(msg.id)} className="text-green-500 hover:text-green-400"><Check size={16} /></button>
                        <button onClick={() => setEditingMessageId(null)} className="text-red-500 hover:text-red-400"><X size={16} /></button>
                      </div>
                    ) : (
                      <p className="text-sm break-words">
                        {msg.text} 
                        {msg.isEdited && <span className="text-[10px] text-zinc-500 ml-2 italic">(editado)</span>}
                      </p>
                    )}
                  </div>
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
            placeholder="Enviar como moderador..."
            className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || isSending} 
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        title="Limpar Chat"
        message="Tem certeza que deseja apagar todas as mensagens deste chat? Esta ação não pode ser desfeita."
        onConfirm={handleClearChat}
        onCancel={() => setShowClearConfirm(false)}
        confirmText={isClearing ? "Limpando..." : "Limpar Tudo"}
        isDanger={true}
      />

      <ConfirmationModal
        isOpen={!!messageToDelete}
        title="Apagar Mensagem"
        message="Deseja realmente apagar esta mensagem?"
        onConfirm={handleDeleteMessage}
        onCancel={() => setMessageToDelete(null)}
        confirmText="Apagar"
        isDanger={true}
      />
    </div>
  );
};
