import React, { memo } from 'react';
import { useAuditLogs } from '../../hooks/useQueries';
import { Loader2 } from 'lucide-react';

function AuditManager() {
  const { data: auditLogs = [], isLoading } = useAuditLogs();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800">Logs de Auditoria de Operações Críticas</h3>
        <p className="text-xs text-slate-400 mt-0.5">Rastreabilidade completa de logins, exclusões, backups e alterações da base</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
              <th className="px-4 py-2.5 font-bold">Data/Hora</th>
              <th className="px-4 py-2.5 font-bold">Usuário</th>
              <th className="px-4 py-2.5 font-bold">Operação</th>
              <th className="px-4 py-2.5 font-bold">Detalhes do Log</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
            {auditLogs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-400 font-normal">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-indigo-600">{log.user}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold border uppercase">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-600">{log.details}</td>
              </tr>
            ))}
            {auditLogs.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-6 text-slate-400 italic">Nenhum log gravado no Firestore.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(AuditManager);
