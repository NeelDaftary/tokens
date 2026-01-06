import { ReactNode } from 'react';

interface ConfigSectionProps {
  title: string;
  children: ReactNode;
  columns?: number;
}

export default function ConfigSection({ title, children, columns = 1 }: ConfigSectionProps) {
  const gridClass = columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'md:grid-cols-3' : '';
  
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>
      <div className={`grid gap-3 ${gridClass}`}>
        {children}
      </div>
    </section>
  );
}

