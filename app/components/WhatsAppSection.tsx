import { useMemo, useState } from 'react';
import type { Dipendente, Reparto, WeekInfo } from '../types';
import { emoji, reparti } from '../lib/schedule';
import { employeeKey, formatEmployeeTurnsMessage, normalizePhoneNumber, repartoLabel, whatsappLink } from '../lib/whatsapp';

export function WhatsAppSection({
  employees,
  schedule,
  closed,
  weekInfo,
}: {
  employees: Dipendente[];
  schedule: Record<string, string[]>;
  closed: Record<string, boolean>;
  weekInfo: WeekInfo;
}) {
  const [reparto, setReparto] = useState<Reparto | 'Tutti'>('Tutti');
  const filteredEmployees = useMemo(
    () => employees.filter((employee) => employee.nome && (reparto === 'Tutti' || employee.reparto === reparto)),
    [employees, reparto],
  );
  const [selectedKey, setSelectedKey] = useState('');

  const selectedEmployee =
    filteredEmployees.find((employee) => employeeKey(employee, employees.indexOf(employee)) === selectedKey) ||
    filteredEmployees[0];

  const selectedMessage = selectedEmployee
    ? formatEmployeeTurnsMessage(selectedEmployee, weekInfo, schedule, closed)
    : '';

  function openWhatsApp(employee: Dipendente) {
    const phone = normalizePhoneNumber(employee.telefono);
    if (!phone) {
      alert(`Numero WhatsApp mancante per ${employee.nome}. Inseriscilo nella sezione Dipendenti.`);
      return;
    }

    const message = formatEmployeeTurnsMessage(employee, weekInfo, schedule, closed);
    window.open(whatsappLink(phone, message), '_blank', 'noopener,noreferrer');
  }

  return (
    <section>
      <div className="card">
        <h2>📲 Invia turni WhatsApp</h2>
        <p className="muted">
          I messaggi usano solo Pranzo, Cena e Riposo. Non vengono indicati gli orari.
        </p>

        <div className="actions no-print">
          <button className={reparto === 'Tutti' ? 'btn primary' : 'btn'} onClick={() => setReparto('Tutti')}>
            Tutto lo staff
          </button>
          {reparti.map((r) => (
            <button key={r} className={reparto === r ? 'btn primary' : 'btn'} onClick={() => setReparto(r)}>
              {emoji(r)} {repartoLabel(r)}
            </button>
          ))}
        </div>
      </div>

      <div className="card no-print">
        <h3>Anteprima dipendente</h3>
        <select
          value={selectedEmployee ? employeeKey(selectedEmployee, employees.indexOf(selectedEmployee)) : ''}
          onChange={(event) => setSelectedKey(event.target.value)}
        >
          {filteredEmployees.map((employee) => {
            const key = employeeKey(employee, employees.indexOf(employee));
            return (
              <option key={key} value={key}>
                {employee.nome} · {employee.reparto}
              </option>
            );
          })}
        </select>

        <pre className="whatsapp-preview">{selectedMessage}</pre>

        {selectedEmployee && (
          <button className="btn whatsapp" onClick={() => openWhatsApp(selectedEmployee)}>
            📲 Apri WhatsApp per {selectedEmployee.nome}
          </button>
        )}
      </div>

      <div className="card">
        <h3>Invio rapido</h3>
        {filteredEmployees.length === 0 && <p className="muted">Nessun dipendente trovato.</p>}

        {filteredEmployees.map((employee) => {
          const phone = normalizePhoneNumber(employee.telefono);
          const key = employeeKey(employee, employees.indexOf(employee));

          return (
            <div className="whatsapp-row" key={key}>
              <div>
                <strong>{employee.nome}</strong>
                <span className="muted"> · {employee.reparto}</span>
                <div className={phone ? 'muted' : 'danger-text'}>
                  {phone ? `WhatsApp: ${employee.telefono}` : 'Numero mancante'}
                </div>
              </div>

              <button className="btn whatsapp no-print" onClick={() => openWhatsApp(employee)} disabled={!phone}>
                📲 Invia
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
