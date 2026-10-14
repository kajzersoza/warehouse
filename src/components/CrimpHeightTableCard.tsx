import React from 'react';
import { TerminalCrimpRecord } from '../types/crimpHeight';

const WIRE_SIZES = [
  '0.25',
  '0.35',
  '0.50',
  '0.75',
  '1.00',
  '1.50',
  '2.00',
  '2.50',
  '3.00',
  '4.00',
  '5.00',
  '6.00',
];

interface CrimpHeightTableCardProps {
  records: TerminalCrimpRecord[];
  productName?: string;
  productId?: string;
}

export const CrimpHeightTableCard: React.FC<CrimpHeightTableCardProps> = ({
  records,
  productId,
}) => {
  // Csak olyan rekordokat jelenítünk meg, amelyek tartalmaznak tényleges beállítást vagy sarumagasságot
  const validRecords = (records || []).filter((r) =>
    r.specs?.some(
      (s) => (s.setting && s.setting.trim() !== '') || (s.height && s.height.trim() !== '')
    )
  );

  if (!validRecords || validRecords.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden mt-6">
      {/* Kártya fejléc - illeszkedik a többi kártya stílusához */}
      <div className="bg-gradient-to-r from-slate-100 via-sky-50 to-blue-50 px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#7098BA] text-white flex items-center justify-center shadow-xs">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">
                Sarumagasság és Fejbeállítás Táblázat
              </h3>
              <span className="px-2 py-0.5 text-xs font-semibold bg-[#7098BA]/20 text-[#1E3E62] rounded-full">
                {validRecords.length} {validRecords.length === 1 ? 'beállítás' : 'beállítás'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Gyári sarumagasságok (crimp height), szerszámfejek és gépbeállítások
              {productId ? ` (${productId})` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* A sarumagasság táblázat a pontos gyári elrendezésben */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#7098BA] text-gray-950 font-bold border-b border-gray-400 select-none">
              <th className="py-2.5 px-3 border border-gray-300 text-center min-w-[120px]">
                Saru kód
              </th>
              <th className="py-2.5 px-2 border border-gray-300 text-center w-20">
                Saru hely
              </th>
              <th className="py-2.5 px-2 border border-gray-300 text-center w-24">
                Saruzó Fej
              </th>
              <th className="py-2.5 px-2 border border-gray-300 text-center w-20">
                Fej hely
              </th>
              {WIRE_SIZES.map((ws) => (
                <th
                  key={ws}
                  className="py-2.5 px-2 border border-gray-300 text-center min-w-[56px] text-sm font-extrabold"
                >
                  {ws}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {validRecords.map((rec, rIdx) => {
              const specMap = new Map(rec.specs.map((s) => [s.wireSize, s]));
              const hasNote1 = rec.specs.some((s) => s.note1 && s.note1.trim());
              const hasNote2 = rec.specs.some((s) => s.note2 && s.note2.trim());
              const isEven = rIdx % 2 === 0;
              const bgClass = isEven ? 'bg-white' : 'bg-slate-50/50';
              const row2Identifier = rec.row2Code || (rec.productId && rec.productId !== rec.saruCode ? rec.productId : '');

              return (
                <React.Fragment key={rec.id || `rec-${rIdx}`}>
                  {/* Felső sor: Saru kód (vastag), Saru hely, KÉK Saruzó Fej, Fej hely, és a gépbeállítások */}
                  <tr className={`${bgClass} hover:bg-sky-50/40 transition-colors`}>
                    {/* Saru kód */}
                    <td className="py-2 px-3 border border-gray-300 text-center font-mono font-extrabold text-sm text-gray-950 tracking-tight bg-gray-50/60">
                      {rec.saruCode || '—'}
                    </td>

                    {/* Saru hely */}
                    <td className="py-2 px-2 border border-gray-300 text-center font-bold text-gray-700 bg-gray-50/30">
                      {rec.saruLocation ? (
                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 border border-gray-300">
                          {rec.saruLocation}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Saruzó Fej - kiemelt kék színnel */}
                    <td className="py-2 px-2 border border-gray-300 text-center">
                      {rec.applicatorFej ? (
                        <span className="font-extrabold text-blue-600 text-sm tracking-wide">
                          {rec.applicatorFej}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Fej hely */}
                    <td className="py-2 px-2 border border-gray-300 text-center font-bold text-gray-700 bg-gray-50/30">
                      {rec.fejLocation ? (
                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 border border-gray-300">
                          {rec.fejLocation}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* 1. sor cellái: Beállítás (pl. D, C, B, A vagy 22.0) */}
                    {WIRE_SIZES.map((ws) => {
                      const sp = specMap.get(ws);
                      return (
                        <td
                          key={ws}
                          className="py-1.5 px-2 border border-gray-300 text-center font-medium text-gray-700"
                        >
                          {sp?.setting || ''}
                        </td>
                      );
                    })}
                  </tr>

                  {/* 2. sor: 2. sori Cikkszám az 1. oszlopban (pl. 2122120061), és a tényleges SARUMAGASSÁG értékek */}
                  <tr className={`${bgClass} hover:bg-sky-50/40 transition-colors`}>
                    {/* Row 2 első oszlop: a cikkszám az Excel táblázat szerint */}
                    <td className="py-1.5 px-3 border border-gray-300 text-center font-mono font-bold text-xs text-gray-900 bg-gray-50/50">
                      {row2Identifier ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 inline-block font-mono font-bold text-xs">
                          {row2Identifier}
                        </span>
                      ) : (
                        ''
                      )}
                    </td>

                    {/* 2. sori üres cellák a fejléchez tartozó oszlopokban */}
                    <td className="py-1.5 px-2 border border-gray-300 text-center text-gray-300 bg-gray-50/20">—</td>
                    <td className="py-1.5 px-2 border border-gray-300 text-center text-gray-300 bg-gray-50/20">—</td>
                    <td className="py-1.5 px-2 border border-gray-300 text-center text-gray-300 bg-gray-50/20">—</td>

                    {/* 2. sor cellái: Tényleges SARUMAGASSÁG értékek vastag feketével */}
                    {WIRE_SIZES.map((ws) => {
                      const sp = specMap.get(ws);
                      return (
                        <td
                          key={ws}
                          className="py-1.5 px-2 border border-gray-300 text-center font-extrabold text-sm text-gray-950 font-mono"
                        >
                          {sp?.height || ''}
                        </td>
                      );
                    })}
                  </tr>

                  {/* 3. sor cellái (ha van megjegyzés, pl. piros DUPLA BLANK vagy 0.50 DB) */}
                  {hasNote1 && (
                    <tr className={`${bgClass} hover:bg-sky-50/40 transition-colors`}>
                      <td className="py-1 px-2 border border-gray-300 text-center text-gray-300 text-[10px]">—</td>
                      <td className="py-1 px-2 border border-gray-300 text-center text-gray-300 text-[10px]">—</td>
                      <td className="py-1 px-2 border border-gray-300 text-center text-gray-300 text-[10px]">—</td>
                      <td className="py-1 px-2 border border-gray-300 text-center text-gray-300 text-[10px]">—</td>
                      {WIRE_SIZES.map((ws) => {
                        const sp = specMap.get(ws);
                        return (
                          <td
                            key={ws}
                            className="py-1 px-1.5 border border-gray-300 text-center text-[10px] font-bold text-red-600 uppercase tracking-tighter"
                          >
                            {sp?.note1 || ''}
                          </td>
                        );
                      })}
                    </tr>
                  )}

                  {/* 4. sor cellái (ha van kék/második megjegyzés, pl. 0.50) */}
                  {hasNote2 && (
                    <tr className={`${bgClass} hover:bg-sky-50/40 transition-colors`}>
                      <td className="py-1 px-2 border border-gray-300 text-center text-gray-300 text-[10px]">—</td>
                      <td className="py-1 px-2 border border-gray-300 text-center text-gray-300 text-[10px]">—</td>
                      <td className="py-1 px-2 border border-gray-300 text-center text-gray-300 text-[10px]">—</td>
                      <td className="py-1 px-2 border border-gray-300 text-center text-gray-300 text-[10px]">—</td>
                      {WIRE_SIZES.map((ws) => {
                        const sp = specMap.get(ws);
                        return (
                          <td
                            key={ws}
                            className="py-1 px-1.5 border border-gray-300 text-center text-[10px] font-bold text-blue-600 font-mono"
                          >
                            {sp?.note2 || ''}
                          </td>
                        );
                      })}
                    </tr>
                  )}

                  {/* A táblázat teljes alsó részére összevont Megjegyzés sor (egyetlen helyen, teljes szélességben) */}
                  {rec.comment && (
                    <tr className="bg-amber-50/90 border-t border-b border-amber-300">
                      <td
                        colSpan={4 + WIRE_SIZES.length}
                        className="py-2.5 px-4 text-left border border-amber-200"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-900 shrink-0 uppercase tracking-wider">
                            Megjegyzés
                          </span>
                          <span className="font-semibold text-gray-950 text-xs sm:text-sm leading-relaxed">
                            {rec.comment}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Elválasztó sáv a blokkok között */}
                  <tr className="bg-gray-100/60 h-2">
                    <td colSpan={4 + WIRE_SIZES.length} className="border-b border-gray-300 py-1" />
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
