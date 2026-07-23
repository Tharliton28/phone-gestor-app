import React from 'react';
import { Bell, HelpCircle, Zap } from 'lucide-react';

const Topbar = () => {
  return (
    <header style={styles.topbar}>
      <div style={styles.leftSection}>
      </div>

      <div style={styles.centerSection}>
        <span style={styles.companyText}>Empresa: Biscoito Imports LTDA - 64.951.713/0001...</span>
      </div>

      <div style={styles.rightSection}>
        <div style={styles.iconGroup}>
          
          {/* BOTÃO UPGRADE PRO */}
          <button style={styles.btnUpgrade} onClick={() => alert('Abrir planos de assinatura...')}>
            <Zap size={14} color="#fbbf24" fill="#fbbf24" /> Upgrade PRO
          </button>

          <span style={styles.iconWrapper}><HelpCircle size={18} /></span>
          <span style={styles.iconWrapper}><Bell size={18} /></span>   
        </div>
        
        <div style={styles.userProfile}>
          <div style={styles.avatar}>WV</div>
          <span style={styles.userName}>Wesley de Sousa Viana ▾</span>
        </div>
      </div>
    </header>
  );
};

const styles = {
  topbar: {
    height: '60px',
    backgroundColor: '#11131c', 
    borderBottom: '1px solid #1f2233',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    color: '#e2e8f0',
  },
  leftSection: { display: 'flex', alignItems: 'center' },
  centerSection: {
    backgroundColor: '#161925',
    padding: '6px 16px',
    borderRadius: '4px',
    border: '1px solid #2a2e3f',
  },
  companyText: { fontSize: '13px', color: '#a1a1aa' },
  rightSection: { display: 'flex', alignItems: 'center', gap: '24px' },
  iconGroup: { display: 'flex', alignItems: 'center', gap: '12px' },
  
  btnUpgrade: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)', 
    border: '1px solid rgba(251, 191, 36, 0.3)', 
    color: '#fbbf24', 
    padding: '6px 12px', 
    borderRadius: '20px', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '6px', 
    fontSize: '12px', 
    fontWeight: 'bold', 
    marginRight: '10px'
  },

  iconWrapper: {
    width: '32px', height: '32px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#161925', borderRadius: '50%',
    color: '#a1a1aa', cursor: 'pointer',
  },
  userProfile: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' },
  avatar: {
    width: '36px', height: '36px',
    backgroundColor: '#1e3a8a', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', fontWeight: 'bold'
  },
  userName: { fontSize: '14px', color: '#e2e8f0' }
};

export default Topbar;