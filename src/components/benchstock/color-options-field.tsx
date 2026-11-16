import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ColorOption } from '@/lib/storefront';

export function ColorOptionsField({ value, onChange, label = 'Color options' }: { value: ColorOption[]; onChange: (v: ColorOption[]) => void; label?: string }) {
  const set = (i: number, patch: Partial<ColorOption>) => onChange(value.map((c, j) => j === i ? { ...c, ...patch } : c));
  return <fieldset className="color-options-field"><legend>{label}</legend>
    {value.map((c, i) => <div className="color-option-row" key={i}>
      <input type="color" aria-label={`Swatch ${i + 1}`} value={c.hex} onChange={e => set(i, { hex: e.target.value })}/>
      <input required maxLength={60} placeholder="Color name" aria-label={`Color name ${i + 1}`} value={c.name} onChange={e => set(i, { name: e.target.value })}/>
      <label className="stock-checkbox"><input type="checkbox" checked={c.in_stock} onChange={e => set(i, { in_stock: e.target.checked })}/> In stock</label>
      <Button type="button" variant="ghost" size="icon" aria-label={`Remove color ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2/></Button>
    </div>)}
    <Button type="button" variant="outline" onClick={() => onChange([...value, { name: '', hex: '#f97316', in_stock: true }])}><Plus/> Add color</Button>
  </fieldset>;
}

export function Swatches({ colors, selected, onSelect }: { colors: ColorOption[]; selected?: string; onSelect?: (name: string) => void }) {
  if (!colors.length) return null;
  return <div className="swatch-row" role={onSelect ? 'radiogroup' : undefined} aria-label="Colors">{colors.map(c => onSelect
    ? <button type="button" key={c.name} role="radio" aria-checked={selected === c.name} disabled={!c.in_stock} title={c.in_stock ? c.name : `${c.name} (unavailable)`} aria-label={c.name} className={`swatch-dot${selected === c.name ? ' is-selected' : ''}`} style={{ backgroundColor: c.hex }} onClick={() => onSelect(c.name)}/>
    : <span key={c.name} title={c.in_stock ? c.name : `${c.name} (unavailable)`} aria-label={c.name} className={`swatch-dot${c.in_stock ? '' : ' is-out'}`} style={{ backgroundColor: c.hex }}/>)}</div>;
}
