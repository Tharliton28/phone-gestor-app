import React from 'react';
import { ArrowLeft, Save, User, Smartphone, AlertCircle, Wrench, DollarSign } from 'lucide-react';

const OSForm = ({ aoVoltar }) => {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <button onClick={aoVoltar} style={styles.btnBack}><ArrowLeft size={16} /> Voltar</button>
          <h2 style={{color: '#fff', fontSize: '18px'}}>Abertura de Ordem de Serviço</h2>
        </div>
      </div>

      <div style={styles.content}>
        {/* CLIENTE */}
        <div style={styles.section}>
          <h3 style={styles.secTitle}><User size={16} color="#38bdf8" /> Dados do Cliente</h3>
          <div style={styles.grid2}>
            <div style={styles.inputGroup}><label style={styles.label}>Cliente:</label><input style={styles.input} placeholder="Buscar..." /></div>
            <div style={styles.inputGroup}><label style={styles.label}>Contato:</label><input style={styles.input} disabled placeholder="(85) 9..." /></div>
          </div>
        </div>

        {/* APARELHO */}
        <div style={styles.section}>
          <h3 style={styles.secTitle}><Smartphone size={16} color="#38bdf8" /> Dados do Equipamento</h3>
          <div style={styles.grid3}>
            <div style={styles.inputGroup}><label style={styles.label}>Modelo/Marca:</label><input style={styles.input} placeholder="Ex: iPhone 14 Plus" /></div>
            <div style={styles.inputGroup}><label style={styles.label}>IMEI/Serial:</label><input style={styles.input} /></div>
            <div style={styles.inputGroup}><label style={styles.label}>Cor/Acessórios:</label><input style={styles.input} /></div>
          </div>
          <div style={{marginTop: '15px'}}>
            <label style={styles.label}>Estado Físico (Arranhões, trincos, etc):</label>
            <textarea style={{...styles.input, height: '60px', resize: 'none'}}></textarea>
          </div>
        </div>

        {/* DIAGNÓSTICO */}
        <div style={styles.section}>
          <h3 style={styles.secTitle}><AlertCircle size={16} color="#fbbf24" /> Defeito e Laudo Técnico</h3>
          <div style={styles.grid2}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Relato do Cliente:</label>
              <textarea style={{...styles.input, height: '80px', resize: 'none'}} placeholder="Ex: Celular caiu na água e não liga..."></textarea>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Laudo Técnico / Observações:</label>
              <textarea style={{...styles.input, height: '80px', resize: 'none'}} placeholder="Restrito ao técnico..."></textarea>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}><DollarSign size={20} color="#4ade80" /><span style={{color: '#fff', fontSize: '20px', fontWeight: 'bold'}}>Total: R$ 0,00</span></div>
        <button style={styles.btnSave}><Save size={18} /> Salvar OS</button>
      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#11131c', borderRadius: '8px', border: '1px solid #1f2233', display: 'flex', flexDirection: 'column', flex: 1, maxHeight: '85vh' },
  header: { padding: '20px', borderBottom: '1px solid #1f2233', backgroundColor: '#161925' },
  btnBack: { backgroundColor: 'transparent', border: '1px solid #2a2e3f', color: '#94a3b8', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  content: { padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' },
  section: { backgroundColor: '#161925', border: '1px solid #1f2233', borderRadius: '8px', padding: '20px' },
  secTitle: { display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '14px', marginBottom: '15px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { color: '#94a3b8', fontSize: '12px' },
  input: { backgroundColor: '#0f111a', border: '1px solid #2a2e3f', borderRadius: '4px', padding: '10px', color: '#fff', fontSize: '13px' },
  footer: { padding: '20px', borderTop: '1px solid #1f2233', backgroundColor: '#161925', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnSave: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }
};

export default OSForm;