import { queryOptions } from '@tanstack/react-query';
import { getCatalog } from './storefront.functions';
export const catalogOptions = queryOptions({ queryKey: ['public-catalog'], queryFn: () => getCatalog(), staleTime: 30_000 });