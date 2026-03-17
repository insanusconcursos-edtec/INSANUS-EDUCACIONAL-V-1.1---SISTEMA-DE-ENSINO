import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Image, Copy, Check } from 'lucide-react';
import { TictoProduct } from '../../../types/product';
import { getProducts, deleteProduct } from '../../../services/productService';
import ProductFormModal from './ProductFormModal';

export default function ProductsManager() {
  const [products, setProducts] = useState<TictoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<TictoProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pega o domínio atual do site dinamicamente e adiciona a rota da API
  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/ticto` : '';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleEdit = (product: TictoProduct) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      // Atualiza a lista na tela removendo o produto deletado
      setProducts(products.filter(p => p.id !== productToDelete.id));
      setProductToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      alert("Erro ao excluir o produto. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.tictoId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Produtos Ticto</h1>
        <button
          onClick={() => {
            setSelectedProduct(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          NOVO PRODUTO
        </button>
      </div>

      {/* Card da URL do Webhook */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
            🔗 URL do Webhook (Integração Ticto)
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Copie a URL abaixo e cole no painel da Ticto para ativar a liberação e cancelamento automático de acessos.
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 overflow-hidden">
          <code className="text-xs text-zinc-400 px-2 truncate max-w-[200px] md:max-w-[300px] select-all">
            {webhookUrl}
          </code>
          <button
            onClick={handleCopyWebhook}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition ${
              copied ? 'bg-green-600/20 text-green-500' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Buscar produto por nome ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-zinc-300">
            <thead className="bg-zinc-800/50 text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-6 py-4 font-medium">Nome do Produto</th>
                <th className="px-6 py-4 font-medium">ID Ticto</th>
                <th className="px-6 py-4 font-medium">Tipo</th>
                <th className="px-6 py-4 font-medium">Acesso (Dias)</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    Carregando produtos...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {product.coverUrl ? (
                          <img 
                            src={product.coverUrl} 
                            alt={product.name} 
                            className="w-14 h-24 min-w-[56px] object-cover rounded-md border border-zinc-700 shadow-md" 
                          />
                        ) : (
                          <div className="w-14 h-24 min-w-[56px] bg-zinc-800 rounded-md border border-zinc-700 flex items-center justify-center shadow-md">
                            <Image className="text-zinc-500" size={24} />
                          </div>
                        )}
                        <span className="text-sm font-bold text-white whitespace-normal line-clamp-2">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{product.tictoId}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs font-medium">
                        {product.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">{product.accessDays}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setProductToDelete(product)}
                          className="text-zinc-400 hover:text-red-500 transition p-2 hover:bg-red-500/10 rounded-lg"
                          title="Excluir Produto"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <ProductFormModal
          product={selectedProduct}
          onClose={() => setIsModalOpen(false)}
          onSave={loadProducts}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {productToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Excluir Produto?</h3>
            <p className="text-zinc-400 text-sm">
              Tem certeza que deseja excluir o produto <strong className="text-white">{productToDelete.name}</strong>? 
              Esta ação removerá o pacote do sistema, mas não revogará os acessos dos alunos que já o compraram.
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition disabled:opacity-50"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? 'EXCLUINDO...' : 'SIM, EXCLUIR PRODUTO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
