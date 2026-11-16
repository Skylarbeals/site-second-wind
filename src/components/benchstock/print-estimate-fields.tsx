import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calcMaterialCost, type InventoryItem } from '@/lib/inventory';
import { calcPrinterRunningCost, MAX_GCODE_BYTES, parseElegooEstimate } from '@/lib/print-estimate';

const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export function PrintEstimateFields({ grams, setGrams, seconds, setSeconds, filament }: {
  grams: string; setGrams: (value: string) => void; seconds: string; setSeconds: (value: string) => void; filament: InventoryItem | undefined;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const duration = Number(seconds);
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor(duration % 3600 / 60);
  const remainingSeconds = duration % 60;
  const valid = Number.isFinite(duration) && duration > 0 && Number.isFinite(Number(grams)) && Number(grams) > 0;
  const running = valid ? calcPrinterRunningCost(duration) : 0;
  const material = valid && filament ? calcMaterialCost(Number(grams), filament.unitCost, filament.rollWeightKg) : 0;
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setError(''); setBusy(true);
    try {
      if (!file.name.toLowerCase().endsWith('.gcode') || file.size <= 0 || file.size > MAX_GCODE_BYTES) throw new Error('Choose an exported .gcode file up to 50 MB.');
      const estimate = parseElegooEstimate(await file.text());
      setGrams(String(estimate.grams)); setSeconds(String(estimate.seconds)); setFileName(file.name);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not read the slice estimate.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return <>
    <div><Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}><Upload />{busy ? 'Reading…' : 'Import Elegoo slice estimate'}</Button><input ref={input} type="file" accept=".gcode" hidden aria-label="Sliced G-code estimate" onChange={e => void importFile(e.target.files?.[0])} />{fileName && <p className="item-meta">{fileName}</p>}</div>
    <label>Estimated print time (hours)<input type="number" min="0" step="1" value={seconds ? hours : ''} onChange={e => setSeconds(String(Number(e.target.value) * 3600 + minutes * 60 + remainingSeconds))} /></label>
    <label>Minutes<input type="number" min="0" max="59" step="1" value={seconds ? minutes : ''} onChange={e => setSeconds(String(hours * 3600 + Number(e.target.value) * 60 + remainingSeconds))} /></label>
    {valid && <dl><dt>Printer running · {hours}h {minutes}m{remainingSeconds ? ` ${remainingSeconds}s` : ''} · $5/hour</dt><dd>{money(running)}</dd><dt>Filament{filament ? '' : ' · choose a spool'}</dt><dd>{filament ? money(material) : '—'}</dd>{filament && <><dt>Printer + filament estimate</dt><dd>{money(running + material)}</dd></>}</dl>}
    {error && <p className="quote-error" role="alert">{error}</p>}
  </>;
}