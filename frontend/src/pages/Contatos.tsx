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
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Clientes & Fornecedores
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestão de carteira de clientes, limite de crediário e catálogo de fornecedores
          </p>
        </div>

        <button
          onClick={() =>
            activeTab === 'CLIENTES' ? setNewClientModal(true) : setNewSupplierModal(true)
          }
          className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'CLIENTES' ? 'Novo Cliente' : 'Novo Fornecedor'}</span>
        </button>
      </div>

      {/* High-Resolution Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#000000] border border-white/[0.16] shadow-lg">
        {/* Modern Segmented Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#000000] border border-white/[0.16]">
          <button
            onClick={() => setActiveTab('CLIENTES')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 active:scale-95 ${
              activeTab === 'CLIENTES'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/25 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'CLIENTES'
                  ? 'bg-black/30 text-white'
                  : 'bg-[#000000] text-slate-300 border border-white/[0.16]'
              }`}
            >
              {clientes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('FORNECEDORES')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 active:scale-95 ${
              activeTab === 'FORNECEDORES'
                ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/25 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Fornecedores</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'FORNECEDORES'
                  ? 'bg-black/30 text-white'
                  : 'bg-[#000000] text-slate-300 border border-white/[0.16]'
              }`}
            >
              {fornecedores.length}
            </span>
          </button>
        </div>

        {/* High-Resolution Search */}
        <div className="relative flex-1 max-w-xl group">
          <Search className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-400 absolute left-4 top-3.5 transition-colors duration-200 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar por nome, documento ou e-mail...`}
            className="w-full pl-12 pr-10 py-3 rounded-xl bg-[#000000] border border-white/[0.16] text-sm font-medium text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-200"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-white/[0.1] transition-all active:scale-90"
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
            <table className="w-full text-left min-w-[1050px]">
              <thead className="bg-[#000000] border-b border-white/[0.16]">
                <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">E-mail</th>
                  <th className="py-3.5 px-4">CPF / CNPJ</th>
                  <th className="py-3.5 px-4">Telefone</th>
                  <th className="py-3.5 px-4">Limite Total</th>
                  <th className="py-3.5 px-4">Saldo Devedor</th>
                  <th className="py-3.5 px-4">Limite Disponível</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.14]">
                {filteredClientes.map((c) => {
                  const disponivel = Math.max(0, c.limite_credito - c.saldo_devedor_crediario);
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.04] transition-colors group whitespace-nowrap">
                      <td className="py-3.5 px-4 font-bold text-sm text-white group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                        {c.nome}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                        {c.email || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-300 whitespace-nowrap">
                        {c.documento}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                        {c.telefone || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-sm font-bold text-white whitespace-nowrap">
                        {c.limite_credito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3.5 px-4 text-sm font-bold text-amber-400 whitespace-nowrap">
                        {c.saldo_devedor_crediario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3.5 px-4 text-sm font-bold text-emerald-400 whitespace-nowrap">
                        {disponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {c.saldo_devedor_crediario >= c.limite_credito ? (
                          <Badge variant="danger">Limite Esgotado</Badge>
                        ) : (
                          <Badge variant="emerald">Apto para Crediário</Badge>
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
              <thead className="bg-[#000000] border-b border-white/[0.16]">
                <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  <th className="py-3.5 px-4">Nome Fantasia</th>
                  <th className="py-3.5 px-4">Razão Social</th>
                  <th className="py-3.5 px-4">CNPJ</th>
                  <th className="py-3.5 px-4">E-mail</th>
                  <th className="py-3.5 px-4">Telefone</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.14]">
                {filteredFornecedores.map((f) => (
                  <tr key={f.id} className="hover:bg-white/[0.04] transition-colors group whitespace-nowrap">
                    <td className="py-3.5 px-4 font-bold text-sm text-white group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                      {f.nome_fantasia}
                    </td>
                    <td className="py-3.5 px-4 text-sm font-medium text-slate-300 whitespace-nowrap">
                      {f.razao_social}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-400 whitespace-nowrap">
                      {f.cnpj}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {f.email || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {f.telefone || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <Badge variant="emerald">Ativo</Badge>
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
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nome Completo ou Razão Social
            </label>
            <input
              type="text"
              required
              value={cliNome}
              onChange={(e) => setCliNome(e.target.value)}
              placeholder="Ex: Carlos Eduardo Mendes"
              className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                required
                value={cliEmail}
                onChange={(e) => setCliEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                CPF ou CNPJ
              </label>
              <input
                type="text"
                required
                value={cliDoc}
                onChange={(e) => setCliDoc(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={cliTel}
                onChange={(e) => setCliTel(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Limite de Crédito (R$)
              </label>
              <input
                type="number"
                step="50"
                min="0"
                required
                value={cliLimite}
                onChange={(e) => setCliLimite(parseFloat(e.target.value) || 0)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-emerald-400 font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.16]">
            <button
              type="button"
              onClick={() => setNewClientModal(false)}
              className="h-11 px-5 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-sm font-semibold text-slate-300 hover:text-white border border-white/[0.16] active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
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
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nome Fantasia
            </label>
            <input
              type="text"
              required
              value={fornFantasia}
              onChange={(e) => setFornFantasia(e.target.value)}
              placeholder="Ex: TechDistribuidora Brasil"
              className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Razão Social
              </label>
              <input
                type="text"
                required
                value={fornRazao}
                onChange={(e) => setFornRazao(e.target.value)}
                placeholder="Ex: TechDistribuidora Ltda"
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                CNPJ
              </label>
              <input
                type="text"
                required
                value={fornCnpj}
                onChange={(e) => setFornCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.16]">
            <button
              type="button"
              onClick={() => setNewSupplierModal(false)}
              className="h-11 px-5 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-sm font-semibold text-slate-300 hover:text-white border border-white/[0.16] active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
            >
              Salvar Fornecedor
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
