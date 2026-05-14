import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Users,
  CalendarDays,
  DollarSign,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../application/contexts/AuthContext';
import './Layout.css';

export function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/entrar');
  };

  return (
    <div className="layout-container animate-fade-in">
      <aside className="sidebar">
        <div className="sidebar-header" style={{ justifyContent: 'center', padding: '16px 20px 8px 20px' }}>
          <img
            src="/logo.png"
            alt="OdonTech Logo"
            style={{ height: '80px', width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
          />
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/agenda"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <CalendarDays className="nav-icon" />
            <span>Agenda</span>
          </NavLink>

          <NavLink
            to="/financeiro"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <DollarSign className="nav-icon" />
            <span>Financeiro</span>
          </NavLink>

          <NavLink
            to="/pacientes"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end
          >
            <Users className="nav-icon" />
            <span>Pacientes</span>
          </NavLink>
          <button
            className="nav-item w-full"
            onClick={handleLogout}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#ef4444',
              marginBottom: '12px'
            }}
          >
            <LogOut className="nav-icon" style={{ color: '#ef4444' }} />
            <span style={{ fontWeight: 600 }}>Sair do Sistema</span>
          </button>
        </nav>

        <div style={{ padding: '0 12px', marginTop: 'auto', marginBottom: '16px' }}>
          <div className="user-profile" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div className="user-avatar">{user?.nome?.substring(0, 2).toUpperCase() || 'US'}</div>
            <div className="user-info">
              <span className="user-name">{user?.nome || 'Usuário'}</span>
              <span className="user-role">{user?.clinica_nome || 'Admin'}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
