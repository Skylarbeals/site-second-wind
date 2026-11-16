import { filamentLabel, swatchColorFor, type InventoryItem } from '@/lib/inventory';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SpoolSwatch({ color }: { color?: string }) {
  const hex = swatchColorFor(color);
  return <span className={`spool-swatch${hex ? '' : ' is-unknown'}`} style={hex ? { backgroundColor: hex } : undefined} aria-hidden="true" />;
}

/** Filament picker showing a color dot beside each spool's SKU and color name. */
export function FilamentSelect({ items, value, onChange, placeholder = 'Choose filament', disabled, testId, label }: {
  items: InventoryItem[]; value: string; onChange: (id: string) => void; placeholder?: string; disabled?: boolean; testId?: string; label?: string;
}) {
  return <Select value={value} onValueChange={onChange} disabled={!!disabled}>
    <SelectTrigger className="filament-select" data-testid={testId} aria-label={label}><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent>{items.map(item => <SelectItem key={item.id} value={item.id}><span className="spool-option"><SpoolSwatch color={item.color} />{filamentLabel(item)}</span></SelectItem>)}</SelectContent>
  </Select>;
}
