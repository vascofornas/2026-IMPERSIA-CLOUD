const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function Icon({ name }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {draw[name] || null}
    </svg>
  );
}

export function GoogleMark() {
  return (
    <svg className="icon google-mark" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="3" fill="#ffffff" stroke="#4285F4" strokeWidth="1.7" />
      <path d="M3 9.5h18" stroke="#4285F4" strokeWidth="1.7" />
      <path d="M8 4.2v3.2" stroke="#EA4335" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 4.2v3.2" stroke="#34A853" strokeWidth="1.7" strokeLinecap="round" />
      <text x="12" y="18" textAnchor="middle" fontSize="10" fontWeight="700" fill="#4285F4" fontFamily="Plus Jakarta Sans, Segoe UI, sans-serif">G</text>
    </svg>
  );
}

const draw = {
  hoy: <><rect {...common} x="3" y="5" width="18" height="16" rx="2" /><path {...common} d="M3 10h18M8 3v4M16 3v4" /></>,
  entrada: <><path {...common} d="M12 20h9" /><path {...common} d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" /></>,
  personal: <><path {...common} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle {...common} cx="12" cy="7" r="4" /></>,
  professional: <><rect {...common} x="2" y="7" width="20" height="14" rx="2" /><path {...common} d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>,
  social: <><path {...common} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle {...common} cx="9" cy="7" r="4" /><path {...common} d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  agenda: <><rect {...common} x="3" y="5" width="18" height="16" rx="2" /><path {...common} d="M3 10h18M8 3v4M16 3v4" /></>,
  casa: <><path {...common} d="M3 10.5 12 3l9 7.5" /><path {...common} d="M5 9.5V21h14V9.5" /></>,
  habitos: <><path {...common} d="M3 12h4l2-6 4 12 2-6h6" /></>,
  viajes: <><path {...common} d="M22 2 11 13" /><path {...common} d="M22 2 15 22l-4-9-9-4 20-7z" /></>,
  diario: <><path {...common} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path {...common} d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  deseos: <><path {...common} d="M12 3l1.8 5.5H20l-4.6 3.4 1.8 5.6L12 14.8 6.8 17.5l1.8-5.6L4 8.5h6.2z" /></>,
  proyectos: <><rect {...common} x="3" y="3" width="7" height="7" rx="1" /><rect {...common} x="14" y="3" width="7" height="7" rx="1" /><rect {...common} x="3" y="14" width="7" height="7" rx="1" /><rect {...common} x="14" y="14" width="7" height="7" rx="1" /></>,
  reuniones: <><path {...common} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle {...common} cx="9" cy="7" r="4" /><path {...common} d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  memoria: <><path {...common} d="M6 4h9a4 4 0 0 1 0 8H6z" /><path {...common} d="M6 4v17" /></>,
  ideas: <><path {...common} d="M9 18h6M10 22h4" /><path {...common} d="M12 2a7 7 0 0 0-4 12c.6.6 1 1.4 1 2h6c0-.6.4-1.4 1-2a7 7 0 0 0-4-12z" /></>,
  muro: <><path {...common} d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>,
  listas: <><path {...common} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>,
  circulos: <><circle {...common} cx="8" cy="8" r="3" /><circle {...common} cx="16" cy="9" r="2.5" /><circle {...common} cx="12" cy="16" r="2.5" /></>,
  espacios: <><rect {...common} x="3" y="3" width="7" height="18" rx="1" /><rect {...common} x="14" y="3" width="7" height="10" rx="1" /><rect {...common} x="14" y="16" width="7" height="5" rx="1" /></>,
  perfil: <><circle {...common} cx="12" cy="12" r="9" /><circle {...common} cx="12" cy="10" r="3" /><path {...common} d="M6.8 18.2a5.6 5.6 0 0 1 10.4 0" /></>,
  apariencia: <><path {...common} d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 2-2 1.6 1.6 0 0 1 1.6-1.6H19a2 2 0 0 0 2-2A9 9 0 0 0 12 3z" /><circle cx="7.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="10.2" cy="7" r="1.1" fill="currentColor" stroke="none" /><circle cx="14.4" cy="7" r="1.1" fill="currentColor" stroke="none" /><circle cx="16.8" cy="10.8" r="1.1" fill="currentColor" stroke="none" /></>,
  editar: <><path {...common} d="M12 20h9" /><path {...common} d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" /></>,
  borrar: <><path {...common} d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path {...common} d="M10 11v6M14 11v6" /></>,
};
