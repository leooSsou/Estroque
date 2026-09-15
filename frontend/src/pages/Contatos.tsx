import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Cliente, Fornecedor } from '../types';
import { BentoCard } from '../components/common/BentoCard';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Users,
  Building2,
  Plus,
  Search,
  Mail,
  Phone,
  CreditCard,
  CheckCircle2,
  X,
} from 'lucide-react';

export const Contatos: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'CLIENTES' | 'FORNECEDORES'>('CLIENTES');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Client Modal
  const [newClientModal, setNewClientModal] = useState(false);
  const [cliNome, setCliNome] = useState('');
  const [cliEmail, setCliEmail] = useState('');
  const [cliDoc, setCliDoc] = useState('');
  const [cliTel, setCliTel] = useState('');
  const [cliLimite, setCliLimite] = useState(1000.0);

  // New Supplier Modal
  const [newSupplierModal, setNewSupplierModal] = useState(false);
  const [fornFantasia, setFornFantasia] = useState('');
  const [fornRazao, setFornRazao] = useState('');
  const [fornCnpj, setFornCnpj] = useState('');
  const [fornEmail, setFornEmail] = useState('');
  const [fornTel, setFornTel] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [cliData, fornData] = await Promise.all([
        api.getClientes(),
        api.getFornecedores(),
      ]);
      setClientes(cliData);
      setFornecedores(fornData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCliente({
        nome: cliNome,
        email: cliEmail,
        documento: cliDoc,
        telefone: cliTel,
        limite_credito: cliLimite,
        ativo: true,
      });
      toast.success(`Cliente "${cliNome}" cadastrado com sucesso!`);
      setNewClientModal(false);
      setCliNome('');
      setCliEmail('');
      setCliDoc('');
      setCliTel('');
      loadData();
    } catch {
      toast.error('Erro ao cadastrar cliente.');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFornecedor({
        nome_fantasia: fornFantasia,
        razao_social: fornRazao,
        cnpj: fornCnpj,
        email: fornEmail,
        telefone: fornTel,
        ativo: true,
      });
      toast.success(`Fornecedor "${fornFantasia}" cadastrado com sucesso!`);
      setNewSupplierModal(false);
      setFornFantasia('');
      setFornRazao('');
      setFornCnpj('');
      loadData();
    } catch {
      toast.error('Erro ao cadastrar fornecedor.');
    }
  };

  const filteredClientes = clientes.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      c.documento.includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const filteredFornecedores = fornecedores.filter((f) => {
    const q = search.toLowerCase();
    return (
      f.nome_fantasia.toLowerCase().includes(q) ||
      f.razao_social.toLowerCase().includes(q) ||
      f.cnpj.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F3FBF6] tracking-tight">
            Clientes & Fornecedores
          </h1>
        </div>

        <button
          onClick={() =>
            activeTab === 'CLIENTES' ? setNewClientModal(true) : setNewSupplierModal(true)
          }
          className="px-5 py-2.5 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] font-bold text-xs shadow-glow-emerald transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'CLIENTES' ? '+ Novo Cliente' : '+ Novo Fornecedor'}</span>
        </button>
      </div>

      {/* High-Resolution Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-3xl bg-[#0D1917] border border-[rgba(142,182,155,0.18)] shadow-bento-dark">
        {/* Modern Segmented Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] shadow-inner">
          <button
            onClick={() => setActiveTab('CLIENTES')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 active:scale-95 ${
              activeTab === 'CLIENTES'
                ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-[#070E0D] font-bold shadow-glow-emerald scale-[1.02]'
                : 'text-[#94A89E] hover:text-[#F3FBF6] hover:bg-[#142522] border border-transparent hover:border-[rgba(142,182,155,0.18)]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold transition-all ${
                activeTab === 'CLIENTES'
                  ? 'bg-[#070E0D]/30 text-[#070E0D]'
                  : 'bg-[#142522] text-[#8EB69B] border border-[rgba(142,182,155,0.12)]'
              }`}
            >
              {clientes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('FORNECEDORES')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 active:scale-95 ${
              activeTab === 'FORNECEDORES'
                ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-[#070E0D] font-bold shadow-glow-emerald scale-[1.02]'
                : 'text-[#94A89E] hover:text-[#F3FBF6] hover:bg-[#142522] border border-transparent hover:border-[rgba(142,182,155,0.18)]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Fornecedores</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold transition-all ${
                activeTab === 'FORNECEDORES'
                  ? 'bg-[#070E0D]/30 text-[#070E0D]'
                  : 'bg-[#142522] text-[#8EB69B] border border-[rgba(142,182,155,0.12)]'
              }`}
            >
              {fornecedores.length}
            </span>
          </button>
        </div>

        {/* High-Resolution Search */}
        <div className="relative flex-1 max-w-xl group">
          <Search className="w-5 h-5 text-[#8EB69B] group-focus-within:text-[#10B981] absolute left-4 top-3.5 transition-colors duration-200 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar por nome, documento ou e-mail...`}
            className="w-full pl-12 pr-10 py-3 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.2)] text-sm font-medium text-[#F3FBF6] placeholder-[#5E756B] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25 focus:outline-none transition-all duration-200 shadow-inner"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-3.5 text-[#8EB69B] hover:text-[#F3FBF6] p-0.5 rounded-full hover:bg-[rgba(142,182,155,0.15)] transition-all active:scale-90"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tables based on active tab */}
      {activeTab === 'CLIENTES' ? (
        <BentoCard>
          <div className="overflow-x-auto table-scrollbar pb-2">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-[#0A1614] border-b border-[rgba(142,182,155,0.18)]">
                <tr className="text-xs font-bold uppercase tracking-wider text-[#A2B89B]">
                  <th className="py-4 px-4">Cliente / E-mail</th>
                  <th className="py-4 px-4">CPF / CNPJ</th>
                  <th className="py-4 px-4">Telefone</th>
                  <th className="py-4 px-4">Limite Total</th>
                  <th className="py-4 px-4">Saldo Devedor</th>
                  <th className="py-4 px-4">Limite Disponível</th>
                  <th className="py-4 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(142,182,155,0.08)]">
                {filteredClientes.map((c) => {
                  const disponivel = Math.max(0, c.limite_credito - c.saldo_devedor_crediario);
                  return (
                    <tr key={c.id} className="hover:bg-[#142522]/50 transition-colors group">
                      <td className="py-4 px-4">
                        <div className="font-bold text-sm md:text-base text-[#F3FBF6] group-hover:text-[#10B981] transition-colors">
                          {c.nome}
                        </div>
                        <div className="text-xs text-[#A2B89B] font-mono mt-0.5">{c.email}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-sm font-semibold text-[#DAF1DE]">
                        {c.documento}
                      </td>
                      <td className="py-4 px-4 font-mono text-sm text-[#A2B89B]">
                        {c.telefone || '—'}
                      </td>
                      <td className="py-4 px-4 font-mono text-base font-bold text-[#F3FBF6]">
                        R$ {c.limite_credito.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 font-mono text-base font-extrabold text-amber-400">
                        R$ {c.saldo_devedor_crediario.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 font-mono text-base font-extrabold text-[#10B981]">
                        R$ {disponivel.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {c.saldo_devedor_crediario >= c.limite_credito ? (
                          <Badge variant="danger">Limite Esgotado</Badge>
                        ) : (
                          <Badge variant="mint">Apto para Crediário</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </BentoCard>
      ) : (
        <BentoCard>
          <div className="overflow-x-auto table-scrollbar pb-2">
            <table className="w-full text-left min-w-[950px]">
              <thead className="bg-[#0A1614] border-b border-[rgba(142,182,155,0.18)]">
                <tr className="text-xs font-bold uppercase tracking-wider text-[#A2B89B]">
                  <th className="py-4 px-4">Nome Fantasia</th>
                  <th className="py-4 px-4">Razão Social</th>
                  <th className="py-4 px-4">CNPJ</th>
                  <th className="py-4 px-4">Contato / E-mail</th>
                  <th className="py-4 px-4">Telefone</th>
                  <th className="py-4 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(142,182,155,0.08)]">
                {filteredFornecedores.map((f) => (
                  <tr key={f.id} className="hover:bg-[#142522]/50 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="font-bold text-sm md:text-base text-[#F3FBF6] group-hover:text-[#10B981] transition-colors">
                        {f.nome_fantasia}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-[#DAF1DE]">
                      {f.razao_social}
                    </td>
                    <td className="py-4 px-4 font-mono text-sm font-semibold text-[#A2B89B]">
                      {f.cnpj}
                    </td>
                    <td className="py-4 px-4 text-sm text-[#DAF1DE]">
                      {f.email || '—'}
                    </td>
                    <td className="py-4 px-4 font-mono text-sm text-[#A2B89B]">
                      {f.telefone || '—'}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge variant="mint">Ativo</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BentoCard>
      )}

      {/* New Client Modal */}
      <Modal
        isOpen={newClientModal}
        onClose={() => setNewClientModal(false)}
        title="Cadastrar Novo Cliente"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#94A89E] mb-1">Nome Completo</label>
            <input
              type="text"
              required
              value={cliNome}
              onChange={(e) => setCliNome(e.target.value)}
              placeholder="Ex: Carlos Eduardo Mendes"
              className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1">E-mail</label>
              <input
                type="email"
                required
                value={cliEmail}
                onChange={(e) => setCliEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1">CPF ou CNPJ</label>
              <input
                type="text"
                required
                value={cliDoc}
                onChange={(e) => setCliDoc(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs font-mono text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={cliTel}
                onChange={(e) => setCliTel(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs font-mono text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1">Limite de Crédito (R$)</label>
              <input
                type="number"
                step="50"
                min="0"
                required
                value={cliLimite}
                onChange={(e) => setCliLimite(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs font-mono text-[#10B981] font-bold focus:border-[#10B981] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setNewClientModal(false)}
              className="px-4 py-2 rounded-full bg-[#142522] text-xs font-semibold text-[#94A89E]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-xs font-bold shadow-glow-emerald"
            >
              Salvar Cliente
            </button>
          </div>
        </form>
      </Modal>

      {/* New Supplier Modal */}
      <Modal
        isOpen={newSupplierModal}
        onClose={() => setNewSupplierModal(false)}
        title="Cadastrar Novo Fornecedor"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#94A89E] mb-1">Nome Fantasia</label>
            <input
              type="text"
              required
              value={fornFantasia}
              onChange={(e) => setFornFantasia(e.target.value)}
              placeholder="Ex: TechDistribuidora Brasil"
              className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1">Razão Social</label>
              <input
                type="text"
                required
                value={fornRazao}
                onChange={(e) => setFornRazao(e.target.value)}
                placeholder="Ex: TechDistribuidora Ltda"
                className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1">CNPJ</label>
              <input
                type="text"
                required
                value={fornCnpj}
                onChange={(e) => setFornCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-xs font-mono text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setNewSupplierModal(false)}
              className="px-4 py-2 rounded-full bg-[#142522] text-xs font-semibold text-[#94A89E]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-xs font-bold shadow-glow-emerald"
            >
              Salvar Fornecedor
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
