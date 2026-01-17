import { ReactNode } from 'react';

interface ConfigSectionProps {
  title: string;
  children: ReactNode;
  columns?: number;
}

export default function ConfigSection({ title, children, columns = 1 }: ConfigSectionProps) {
  const gridClass = columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'md:grid-cols-3' : '';
  
  return (
    <section 
      className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6 transition-all duration-200 hover:border-white/20"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)",
      }}
    >
      <h2 className="mb-4 text-base font-bold text-white tracking-tight">{title}</h2>
      <div className={`grid gap-4 ${gridClass}`}>
        {children}
      </div>
    </section>
  );
}
