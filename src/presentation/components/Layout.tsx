import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Users,
  CalendarDays,
  DollarSign,
  LogOut,
  Stethoscope,
  Menu,
  X,
  Settings as SettingsIcon,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../application/contexts/AuthContext';
import './Layout.css';

export function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const handleLogout = () => {
    logout();
    navigate('/entrar');
  };

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  return (
    <div className="layout-container animate-fade-in">
      <div className="mobile-header">
        <img src="/odontech_logo_branco.svg" alt="OdonTech Logo" className="mobile-logo" />
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header" style={{ justifyContent: 'center', padding: '16px 20px 8px 20px' }}>
          {!isSidebarCollapsed && (
            <img
              src="/odontech_logo_branco.svg"
              alt="OdonTech Logo"
              style={{ height: '150px', width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
            />
          )}
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/agenda"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(false)}
            title="Agenda"
          >
            <CalendarDays className="nav-icon" />
            {!isSidebarCollapsed && <span>Agenda</span>}
          </NavLink>

          <NavLink
            to="/financeiro"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(false)}
            title="Financeiro"
          >
            <DollarSign className="nav-icon" />
            {!isSidebarCollapsed && <span>Financeiro</span>}
          </NavLink>

          <NavLink
            to="/pacientes"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(false)}
            end
            title="Pacientes"
          >
            <Users className="nav-icon" />
            {!isSidebarCollapsed && <span>Pacientes</span>}
          </NavLink>

          <NavLink
            to="/profissionais"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(false)}
            title="Profissionais"
          >
            <Stethoscope className="nav-icon" />
            {!isSidebarCollapsed && <span>Profissionais</span>}
          </NavLink>

          <NavLink
            to="/configuracoes"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(false)}
            title="Configurações"
          >
            <SettingsIcon className="nav-icon" />
            {!isSidebarCollapsed && <span>Configurações</span>}
          </NavLink>
          <button
            className="nav-item w-full"
            onClick={handleLogout}
            title="Sair do Sistema"
            style={{
              border: 'none',
              background: 'transparent',
              color: '#ef4444',
              marginBottom: '12px'
            }}
          >
            <LogOut className="nav-icon" style={{ color: '#ef4444' }} />
            {!isSidebarCollapsed && <span style={{ fontWeight: 600 }}>Sair do Sistema</span>}
          </button>
        </nav>

        <div style={{ padding: '0 12px', marginTop: 'auto', marginBottom: '16px' }}>
          {!isSidebarCollapsed && (
            <div className="user-profile" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
              <div className="user-avatar">{user?.nome?.substring(0, 1).toUpperCase() || 'US'}</div>
              <div className="user-info">
                <span className="user-name">{user?.nome || 'Usuário'}</span>
                <span className="user-role">{user?.clinica_nome || 'Admin'}</span>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="user-avatar">{user?.nome?.substring(0, 1).toUpperCase() || 'US'}</div>
            </div>
          )}
        </div>

        <button
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isSidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </aside>

      <main className="main-content">
        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
