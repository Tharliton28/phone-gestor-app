import { Construction } from 'lucide-react';

export default function ComingSoon({ title, description }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.icon}>
        <Construction size={32} color="#38bdf8" />
      </div>
      <h2 style={styles.title}>{title}</h2>
      <p style={styles.description}>{description}</p>
      <span style={styles.badge}>Em breve — Fase 4</span>
    </div>
  );
}

const styles = {
  wrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '48px 24px',
    backgroundColor: '#161925',
    borderRadius: '12px',
    border: '1px solid #2a2e3f',
    minHeight: '320px',
  },
  icon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  title: {
    color: '#e2e8f0',
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  description: {
    color: '#94a3b8',
    fontSize: '14px',
    maxWidth: '420px',
    lineHeight: 1.6,
    marginBottom: '20px',
  },
  badge: {
    fontSize: '12px',
    color: '#64748b',
    backgroundColor: '#0f111a',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid #2a2e3f',
  },
};
