import { useState } from 'react'
import {
  BarChart3, Bell, BriefcaseBusiness, Building2, ChevronRight,
  ClipboardList, FileText, LayoutDashboard, Menu, Plus, Search,
  Settings, Users, WalletCards, X,
} from 'lucide-react'

type Module = 'Visão geral' | 'Obras' | 'Serviços' | 'Clientes' | 'Financeiro' | 'Relatórios'

const modules: { label: Module; icon: typeof LayoutDashboard }[] = [
  { label: 'Visão geral', icon: LayoutDashboard },
  { label: 'Obras', icon: Building2 },
  { label: 'Serviços', icon: ClipboardList },
  { label: 'Clientes', icon: Users },
  { label: 'Financeiro', icon: WalletCards },
  { label: 'Relatórios', icon: FileText },
]

const cards = [
  { label: 'Obras ativas', value: '08', note: '+2 neste mês', tone: 'green', icon: Building2 },
  { label: 'Serviços em andamento', value: '24', note: '6 vencem nesta semana', tone: 'amber', icon: BriefcaseBusiness },
  { label: 'A receber', value: 'R$ 48.720', note: '12 lançamentos pendentes', tone: 'blue', icon: WalletCards },
  { label: 'Clientes cadastrados', value: '136', note: '+9 nos últimos 30 dias', tone: 'violet', icon: Users },
]

function App() {
  const [active, setActive] = useState<Module>('Visão geral')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><img src="/assets/logo-original.png" alt="Logo Empreiteiro Saminês" /></div>
          <div><strong>Empreiteiro</strong><span>Saminês</span></div>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><X size={18} /></button>
        </div>
        <div className="workspace-switcher"><span className="workspace-dot" /> Empresa principal <ChevronRight size={15} /></div>
        <nav className="main-nav" aria-label="Navegação principal">
          <p className="nav-caption">GESTÃO</p>
          {modules.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => { setActive(label); setSidebarOpen(false) }}>
              <Icon size={19} strokeWidth={1.8} /><span>{label}</span>{active === label && <span className="active-pill" />}
            </button>
          ))}
          <p className="nav-caption secondary-caption">SISTEMA</p>
          <button className="nav-item"><Bell size={19} strokeWidth={1.8} /><span>Notificações</span><span className="notification-badge">3</span></button>
          <button className="nav-item"><Settings size={19} strokeWidth={1.8} /><span>Configurações</span></button>
        </nav>
        <div className="sidebar-footer"><div className="avatar">AM</div><div><strong>Administrador</strong><span>Plano profissional</span></div><ChevronRight size={16} /></div>
      </aside>
      {sidebarOpen && <button className="backdrop" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu" />}
      <main className="content-area">
        <header className="topbar"><button className="icon-button menu-trigger" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button><div className="breadcrumb"><span>Gestão</span><ChevronRight size={14} /><strong>{active}</strong></div><div className="top-actions"><button className="icon-button search-trigger"><Search size={19} /></button><button className="help-chip">?</button><div className="top-avatar">AM</div></div></header>
        <div className="page-content">
          <section className="page-heading"><div><p className="eyebrow">QUINTA-FEIRA, 14 DE NOVEMBRO DE 2026</p><h1>{active === 'Visão geral' ? 'Bom dia, Antônio' : active}</h1><p className="subheading">Acompanhe o andamento da sua operação em um só lugar.</p></div><button className="primary-button"><Plus size={18} /> Novo registro</button></section>
          {active === 'Visão geral' ? <><section className="metrics-grid">{cards.map(({ label, value, note, tone, icon: Icon }) => <article className="metric-card" key={label}><div className={`metric-icon ${tone}`}><Icon size={20} /></div><p>{label}</p><strong>{value}</strong><span className={`metric-note ${tone}`}>{note}</span></article>)}</section><section className="dashboard-grid"><article className="panel progress-panel"><div className="panel-heading"><div><h2>Obras em andamento</h2><p>Visão consolidada dos seus projetos</p></div><button className="text-button" onClick={() => setActive('Obras')}>Ver todas <ChevronRight size={16} /></button></div><div className="project-list"><Project name="Residencial Morumbi" client="Carlos Eduardo" progress={78} status="No prazo" tone="green" /><Project name="Reforma Escritório Central" client="Construtora Horizonte" progress={54} status="Atenção" tone="amber" /><Project name="Casa de Campo — Etapa 2" client="Mariana Alves" progress={31} status="No prazo" tone="green" /></div></article><article className="panel quick-panel"><div className="panel-heading"><div><h2>Ações rápidas</h2><p>Comece uma nova atividade</p></div><BarChart3 size={20} className="muted-icon" /></div><div className="quick-actions"><QuickAction icon={Building2} title="Nova obra" detail="Cadastre um projeto" /><QuickAction icon={ClipboardList} title="Novo serviço" detail="Adicione uma atividade" /><QuickAction icon={FileText} title="Novo orçamento" detail="Crie uma proposta" /></div></article></section></> : <section className="empty-module panel"><div className="empty-icon"><LayoutDashboard size={25} /></div><h2>Módulo {active}</h2><p>Esta nova área está sendo construída com o fluxo otimizado para Windows e Android.</p><button className="primary-button"><Plus size={18} /> Criar primeiro registro</button></section>}
        </div>
      </main>
    </div>
  )
}

function Project({ name, client, progress, status, tone }: { name: string; client: string; progress: number; status: string; tone: string }) { return <div className="project-row"><div className="project-symbol"><Building2 size={18} /></div><div className="project-info"><strong>{name}</strong><span>{client}</span></div><div className="progress-wrap"><div className="progress-label"><span>Progresso</span><strong>{progress}%</strong></div><div className="progress-bar"><span className={tone} style={{ width: `${progress}%` }} /></div></div><span className={`status-tag ${tone}`}>{status}</span><ChevronRight size={17} className="row-chevron" /></div> }
function QuickAction({ icon: Icon, title, detail }: { icon: typeof Building2; title: string; detail: string }) { return <button className="quick-action"><span className="quick-icon"><Icon size={19} /></span><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight size={16} className="row-chevron" /></button> }

export default App
