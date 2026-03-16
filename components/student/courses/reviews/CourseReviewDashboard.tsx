import React, { useEffect, useState } from 'react';
import { courseReviewService, CourseReview } from '../../../../services/courseReviewService';
import { useAuth } from '../../../../contexts/AuthContext';
import { AlertCircle, CalendarClock, CheckCircle2, ChevronRight, ChevronDown } from 'lucide-react';

export function CourseReviewDashboard({ courseId, onReviewNow }: { courseId: string, onReviewNow: (topicId: string) => void }) {
    const { currentUser: user } = useAuth();
    const [reviews, setReviews] = useState<CourseReview[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = async () => {
        if (!user) return;
        try {
            const data = await courseReviewService.getPendingReviews(user.uid, courseId);
            setReviews(data);
        } catch (error) {
            console.error("Erro ao buscar revisões:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [courseId, user]);

    const handleComplete = async (review: CourseReview) => {
        if (!user) return;
        // Atualização Otimista: Desaparece do ecrã na hora em que clica
        setReviews(prev => prev.filter(r => r.id !== review.id));
        try {
            await courseReviewService.completeReview(user.uid, review);
        } catch (error) {
            console.error("Erro ao concluir revisão:", error);
            fetchReviews(); // Reverte caso dê erro no banco de dados
        }
    };

    if (loading || reviews.length === 0) return null;

    // Garante a formatação da data baseada no fuso horário local do utilizador (YYYY-MM-DD)
    const getLocalDateStr = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const todayStr = getLocalDateStr();

    const overdueReviews = reviews.filter(r => r.scheduledDate < todayStr);
    const todayReviews = reviews.filter(r => r.scheduledDate === todayStr);

    if (overdueReviews.length === 0 && todayReviews.length === 0) return null;

    return (
        <div className="flex flex-col gap-4 mb-6 animate-in fade-in slide-in-from-top-4">
            {/* Secção de Revisões Atrasadas */}
            <ReviewSection 
                title="Revisões em Atraso" 
                count={overdueReviews.length} 
                theme="red" 
                icon={AlertCircle}
                defaultOpen={true}
            >
                {overdueReviews.map(review => (
                    <ReviewCard key={review.id} review={review} onReviewNow={onReviewNow} onComplete={handleComplete} isOverdue={true} />
                ))}
            </ReviewSection>

            {/* Secção de Revisões de Hoje */}
            <ReviewSection 
                title="Revisões Agendadas para Hoje" 
                count={todayReviews.length} 
                theme="yellow" 
                icon={CalendarClock}
                defaultOpen={true}
            >
                {todayReviews.map(review => (
                    <ReviewCard key={review.id} review={review} onReviewNow={onReviewNow} onComplete={handleComplete} isOverdue={false} />
                ))}
            </ReviewSection>
        </div>
    );
}

// ====================================================
// COMPONENTE: Acordeão Inteligente (ReviewSection)
// ====================================================
function ReviewSection({ title, count, theme, defaultOpen = true, icon: Icon, children }: any) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const isRed = theme === 'red';
    
    // Configuração de cores baseada no tema
    const bgHeader = isRed ? 'bg-red-900/20' : 'bg-yellow-900/20';
    const borderColor = isRed ? 'border-red-900/50' : 'border-yellow-900/50';
    const textColor = isRed ? 'text-red-500' : 'text-yellow-500';
    const badgeBg = isRed ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-500';

    if (count === 0) return null;

    return (
        <div className={`border rounded-xl overflow-hidden shadow-lg transition-all ${borderColor}`}>
            {/* Cabeçalho Clicável do Acordeão */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-4 ${bgHeader} hover:opacity-80 transition-opacity cursor-pointer select-none`}
            >
                <div className="flex items-center gap-3">
                    <Icon size={18} className={textColor} />
                    <h3 className={`${textColor} font-black uppercase text-sm`}>{title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeBg}`}>
                        {count}
                    </span>
                </div>
                <ChevronDown size={18} className={`${textColor} transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            
            {/* Corpo do Acordeão */}
            {isOpen && (
                <div className={`p-4 bg-[#121418] flex flex-col gap-2 border-t ${borderColor} animate-in fade-in slide-in-from-top-2`}>
                    {children}
                </div>
            )}
        </div>
    );
}

// ====================================================
// COMPONENTE: Cartão de Revisão Isolado (ReviewCard)
// ====================================================
interface ReviewCardProps {
    review: CourseReview;
    onReviewNow: (id: string) => void;
    onComplete: (r: CourseReview) => void;
    isOverdue: boolean;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, onReviewNow, onComplete, isOverdue }) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#1a1d24] border border-gray-800 rounded-lg p-3 gap-4 hover:border-gray-700 transition-colors group">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                        {review.label}
                    </span>
                    {/* Exibição da Disciplina em destaque sutil */}
                    <span className="text-[10px] text-gray-500 font-bold uppercase truncate">
                        {review.disciplineName || 'GERAL'}
                    </span>
                </div>
                {/* Nome do Tópico */}
                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                    {review.topicName}
                </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => onComplete(review)} className="flex items-center gap-2 px-3 py-1.5 bg-transparent hover:bg-green-900/20 text-green-500 border border-green-900/50 rounded text-xs font-bold uppercase transition-colors">
                    <CheckCircle2 size={14} /> Concluir
                </button>
                <button onClick={() => onReviewNow(review.topicId)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase transition-colors shadow-md shadow-blue-900/20">
                    Revisar <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
};
